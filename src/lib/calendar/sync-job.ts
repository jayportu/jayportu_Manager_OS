/**
 * Sync job que corre sin sesión de usuario (vía service_role).
 * Usado por el cron de GitHub Actions cada hora.
 *
 * - Lee todas las conexiones gmail_connections
 * - Para cada una, refresca el access_token si expiró
 * - Llama Google Calendar API con ese token
 * - Upserta eventos en calendar_events (RLS bypaseado con service_role)
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "@/lib/gmail/oauth";
import type { CalendarEventType } from "@/lib/calendar/types";

interface GCalEventMin {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}

const CAL_API_BASE = "https://www.googleapis.com/calendar/v3";

function inferType(title: string): CalendarEventType {
  const t = title.toLowerCase();
  if (/show|gig|jay\s*portu|\bset\b|@\s/i.test(t)) return "show";
  if (/reuni|meeting|call/i.test(t)) return "reunion";
  if (/follow|seguim/i.test(t)) return "follow_up";
  if (/bloqueo|busy|unavailable/i.test(t)) return "bloqueo";
  if (/contenido|reel|video|grabar/i.test(t)) return "contenido";
  return "otro";
}

/**
 * Sync para un usuario específico. Usa service_role.
 * Refresca el access_token si está expirado.
 */
export async function syncEventsForUser(userId: string): Promise<{
  ok: boolean;
  pulled: number;
  error?: string;
}> {
  const admin = createAdminClient();

  // 1. Leer conexión
  const { data: conn, error: connErr } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (connErr || !conn) {
    return { ok: false, pulled: 0, error: "No connection" };
  }

  // 2. Refrescar token si está por expirar (60s margin)
  let accessToken = conn.access_token as string;
  const expiresAt = new Date(conn.expires_at as string).getTime();
  if (expiresAt - Date.now() < 60_000) {
    try {
      const fresh = await refreshAccessToken(conn.refresh_token as string);
      accessToken = fresh.access_token;
      const newExpiresAt = new Date(
        Date.now() + fresh.expires_in * 1000
      ).toISOString();
      await admin
        .from("gmail_connections")
        .update({
          access_token: fresh.access_token,
          expires_at: newExpiresAt,
          token_type: fresh.token_type,
        })
        .eq("user_id", userId);
    } catch (e) {
      return {
        ok: false,
        pulled: 0,
        error: e instanceof Error ? e.message : "refresh failed",
      };
    }
  }

  // 3. Pedir eventos a Google
  const now = new Date();
  const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const future180 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    timeMin: past90.toISOString(),
    timeMax: future180.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const res = await fetch(
    `${CAL_API_BASE}/calendars/primary/events?${params.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return {
      ok: false,
      pulled: 0,
      error: `Google ${res.status}: ${txt.slice(0, 200)}`,
    };
  }

  const json = (await res.json()) as { items?: GCalEventMin[] };
  const events = json.items || [];

  // 4. Insert / update eventos.
  // OJO: NO usamos upsert con `type`, porque `type` es clasificación del lado
  // DROP (no viene de Google). inferType es solo una adivinanza al importar;
  // si el usuario reclasifica, el re-sync horario NO debe pisarla. Por eso:
  // eventos nuevos → insert con type inferido; existentes → update SIN type.
  const eventIds = events.map((e) => e.id).filter(Boolean) as string[];
  const existingIds = new Set<string>();
  if (eventIds.length > 0) {
    const { data: existing } = await admin
      .from("calendar_events")
      .select("google_event_id")
      .eq("user_id", userId)
      .in("google_event_id", eventIds);
    for (const r of existing || []) {
      if (r.google_event_id) existingIds.add(r.google_event_id);
    }
  }

  let pulled = 0;
  for (const ev of events) {
    if (!ev.id) continue;
    const start =
      ev.start.dateTime ||
      (ev.start.date ? `${ev.start.date}T12:00:00Z` : null); // mediodía UTC: misma fecha en cualquier tz
    const end =
      ev.end.dateTime || (ev.end.date ? `${ev.end.date}T23:59:59Z` : null);
    if (!start || !end) continue;

    const googleFields = {
      user_id: userId,
      google_event_id: ev.id,
      google_calendar_id: "primary",
      title: ev.summary || "(sin título)",
      description: ev.description || "",
      location: ev.location || "",
      start_at: start,
      end_at: end,
      all_day: !ev.start.dateTime,
      sync_state: "synced",
      last_synced_at: new Date().toISOString(),
    };

    if (existingIds.has(ev.id)) {
      // Existente: actualizar solo campos de Google, preservar `type` manual.
      await admin
        .from("calendar_events")
        .update(googleFields)
        .eq("user_id", userId)
        .eq("google_event_id", ev.id);
    } else {
      // Nuevo: insert con type inferido (mejor adivinanza inicial).
      await admin
        .from("calendar_events")
        .insert({ ...googleFields, type: inferType(ev.summary || "") });
    }
    pulled++;
  }

  // 5. Actualizar last_sync_at
  await admin
    .from("gmail_connections")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId);

  return { ok: true, pulled };
}

/**
 * Sync para TODOS los usuarios con conexión Gmail activa.
 * Usado por el cron de GitHub Actions.
 */
export async function syncEventsForAllUsers(): Promise<{
  users: number;
  results: Array<{ user_id: string; ok: boolean; pulled: number; error?: string }>;
}> {
  const admin = createAdminClient();
  const { data: connections } = await admin
    .from("gmail_connections")
    .select("user_id");

  const userIds = (connections || []).map((c: { user_id: string }) => c.user_id);
  const results = [];
  for (const userId of userIds) {
    const r = await syncEventsForUser(userId);
    results.push({ user_id: userId, ...r });
  }
  return { users: userIds.length, results };
}
