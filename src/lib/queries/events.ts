import "server-only";
import { cache } from "react";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { wrapEmail, ctaButton, escapeHtml } from "@/lib/email/templates";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

/**
 * RA-7 — Eventos públicos (un show del calendario publicado) + RSVP de fans.
 * Lecturas/escrituras públicas vía admin client (la página /e/[token] es
 * anónima y calendar_events es owner-only en RLS).
 */

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  start_at: string;
  end_at: string;
  ticket_url: string | null;
  public_token: string;
  dj_user_id: string;
  dj_artist_name: string;
  dj_public_slug: string;
  dj_avatar_url: string;
  dj_hero_url: string;
  going_count: number;
}

/**
 * Lee un evento público por su token. null si no existe o no está publicado.
 * Cacheado por-request (`cache`): la página lo llama en `generateMetadata` y en
 * el componente → así no duplicamos las 3 queries en cada render.
 */
export const getEventByToken = cache(async function getEventByToken(
  token: string
): Promise<PublicEvent | null> {
  if (!token) return null;
  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("calendar_events")
    .select(
      "id, user_id, title, description, location, start_at, end_at, ticket_url, public_token"
    )
    .eq("public_token", token)
    .eq("is_public", true)
    .maybeSingle();
  if (!ev) return null;

  const { data: dj } = await admin
    .from("dj_profile")
    .select("artist_name, public_slug, avatar_url, hero_image_url, account_status")
    .eq("user_id", ev.user_id)
    .maybeSingle();
  // A1: si el DJ está suspendido/baneado, su evento público no se muestra.
  if (dj && (dj as { account_status?: string }).account_status !== "active") {
    return null;
  }

  // M13: "N van" cuenta SOLO los que confirmaron "voy", no los "quizás".
  const { count } = await admin
    .from("event_rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", ev.id)
    .eq("status", "going");

  return {
    id: ev.id,
    title: ev.title,
    description: ev.description ?? "",
    location: ev.location ?? "",
    start_at: ev.start_at,
    end_at: ev.end_at,
    ticket_url: ev.ticket_url ?? null,
    public_token: ev.public_token,
    dj_user_id: ev.user_id,
    dj_artist_name: (dj as { artist_name?: string } | null)?.artist_name ?? "DJ",
    dj_public_slug: (dj as { public_slug?: string } | null)?.public_slug ?? "",
    dj_avatar_url: (dj as { avatar_url?: string } | null)?.avatar_url ?? "",
    dj_hero_url: (dj as { hero_image_url?: string } | null)?.hero_image_url ?? "",
    going_count: count ?? 0,
  };
});

/** Una fila del feed público de eventos (landing + /eventos). */
export interface FeedEvent {
  public_token: string;
  title: string;
  location: string;
  start_at: string;
  ticket_url: string | null;
  dj_artist_name: string;
  dj_public_slug: string;
  dj_avatar_url: string;
  dj_hero_url: string;
  going_count: number;
}

/**
 * Feed de eventos públicos PRÓXIMOS (de cualquier DJ activo), para los fans
 * sin cuenta. Soonest-first. Incluye eventos en curso (terminan a futuro) para
 * que un after de hoy no desaparezca a medianoche. DJs suspendidos/baneados se
 * excluyen (A1). Volumen beta = chico → batch en memoria, sin N+1.
 */
export async function getUpcomingPublicEvents(limit = 12): Promise<FeedEvent[]> {
  const admin = createAdminClient();
  // Traemos desde ayer para no perder shows en curso (start pasado, end futuro);
  // luego filtramos por (end_at ?? start_at) >= ahora en memoria.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: rows } = await admin
    .from("calendar_events")
    .select(
      "id, user_id, title, location, start_at, end_at, ticket_url, public_token"
    )
    .eq("is_public", true)
    .not("public_token", "is", null)
    .gte("start_at", since)
    .order("start_at", { ascending: true })
    .limit(200);

  const now = Date.now();
  const upcoming = ((rows ?? []) as {
    id: string;
    user_id: string;
    title: string;
    location: string | null;
    start_at: string;
    end_at: string | null;
    ticket_url: string | null;
    public_token: string;
  }[]).filter((e) => new Date(e.end_at ?? e.start_at).getTime() >= now);

  if (upcoming.length === 0) return [];

  const userIds = Array.from(new Set(upcoming.map((e) => e.user_id)));
  const eventIds = upcoming.map((e) => e.id);

  const [{ data: djs }, { data: rsvps }] = await Promise.all([
    admin
      .from("dj_profile")
      .select("user_id, artist_name, public_slug, avatar_url, hero_image_url, account_status")
      .in("user_id", userIds),
    admin
      .from("event_rsvps")
      .select("event_id")
      .eq("status", "going")
      .in("event_id", eventIds)
      .limit(100000), // sin esto el default 1000 subcontaba "N van" del feed
  ]);

  const djById = new Map<string, {
    artist_name: string;
    public_slug: string;
    avatar_url: string;
    hero_image_url: string;
    account_status: string;
  }>();
  for (const d of (djs ?? []) as Record<string, string>[]) {
    djById.set(d.user_id, {
      artist_name: d.artist_name ?? "DJ",
      public_slug: d.public_slug ?? "",
      avatar_url: d.avatar_url ?? "",
      hero_image_url: d.hero_image_url ?? "",
      account_status: d.account_status ?? "active",
    });
  }

  const goingByEvent = new Map<string, number>();
  for (const r of (rsvps ?? []) as { event_id: string }[]) {
    goingByEvent.set(r.event_id, (goingByEvent.get(r.event_id) ?? 0) + 1);
  }

  const out: FeedEvent[] = [];
  for (const e of upcoming) {
    const dj = djById.get(e.user_id);
    // A1: si el DJ no existe o no está activo, su evento no aparece en el feed.
    if (!dj || dj.account_status !== "active") continue;
    out.push({
      public_token: e.public_token,
      title: e.title,
      location: e.location ?? "",
      start_at: e.start_at,
      ticket_url: e.ticket_url ?? null,
      dj_artist_name: dj.artist_name,
      dj_public_slug: dj.public_slug,
      dj_avatar_url: dj.avatar_url,
      dj_hero_url: dj.hero_image_url,
      going_count: goingByEvent.get(e.id) ?? 0,
    });
    if (out.length >= limit) break;
  }
  return out;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Crea o actualiza el RSVP de un fan (sin cuenta). Dedupe por (evento, email).
 * Devuelve también `going_count` actualizado.
 */
export async function createRsvp(input: {
  token: string;
  name: string;
  email: string;
  status: "going" | "maybe";
  notifyFuture: boolean;
}): Promise<
  { ok: true; going_count: number } | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };
  const name = input.name.trim().slice(0, 120);
  const status = input.status === "maybe" ? "maybe" : "going";

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("calendar_events")
    .select("id, start_at, end_at")
    .eq("public_token", input.token)
    .eq("is_public", true)
    .maybeSingle();
  if (!ev) return { ok: false, error: "Evento no encontrado" };

  // No aceptar RSVPs de eventos que ya terminaron (sin sentido + ruido en leads).
  const ends = (ev as { end_at?: string; start_at?: string }).end_at
    ?? (ev as { start_at?: string }).start_at;
  if (ends && new Date(ends).getTime() < Date.now()) {
    return { ok: false, error: "Este evento ya pasó." };
  }

  // M14: upsert robusto. Intentamos INSERT; si dos fans con el mismo email
  // entran a la vez chocan en el índice único (event_id, lower(email)) → caemos
  // a UPDATE y CHEQUEAMOS su error (antes se ignoraba y el RSVP se perdía mudo).
  const { error: insErr } = await admin.from("event_rsvps").insert({
    event_id: ev.id,
    name,
    email,
    status,
    notify_future: input.notifyFuture,
  });
  if (insErr) {
    // 23505 = unique_violation → ya existe una fila para (evento, email).
    const isDup = (insErr as { code?: string }).code === "23505";
    if (!isDup) return { ok: false, error: insErr.message };
    const { error: updErr } = await admin
      .from("event_rsvps")
      .update({ name, status, notify_future: input.notifyFuture })
      .eq("event_id", ev.id)
      .eq("email", email);
    if (updErr) return { ok: false, error: updErr.message };
  }

  // M13: el contador devuelto cuenta solo "voy" (igual que la página pública).
  const { count } = await admin
    .from("event_rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", ev.id)
    .eq("status", "going");

  return { ok: true, going_count: count ?? 0 };
}

/**
 * A4 — baja real de avisos. El link de "cancelar avisos" del email lleva el id
 * (uuid opaco, sin PII) de un RSVP del fan. Apagamos `notify_future` para TODAS
 * sus filas (por email), así deja de recibir avisos de ese DJ y de cualquiera.
 * Devuelve el nombre del DJ del evento (para el copy de confirmación) o null.
 */
export async function unsubscribeFanByRsvp(
  rsvpId: string
): Promise<{ ok: boolean }> {
  if (!rsvpId) return { ok: false };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("event_rsvps")
    .select("email")
    .eq("id", rsvpId)
    .maybeSingle();
  const fanEmail = (row as { email?: string } | null)?.email;
  if (!fanEmail) return { ok: false };
  await admin
    .from("event_rsvps")
    .update({ notify_future: false })
    .eq("email", fanEmail);
  return { ok: true };
}

// ─── Owner-side (el DJ gestiona su evento) ────────────────────────────

export interface MyEventInfo {
  id: string;
  title: string;
  description: string;
  start_at: string;
  location: string;
  type: string;
  is_public: boolean;
  public_token: string | null;
  ticket_url: string | null;
}

export async function getMyEvent(eventId: string): Promise<MyEventInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("calendar_events")
    .select(
      "id, title, description, start_at, location, type, is_public, public_token, ticket_url"
    )
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { ...(data as MyEventInfo), description: (data as { description?: string }).description ?? "" };
}

/** Setea (o limpia) el link de venta de entradas del evento (owner). */
export async function setEventTicketUrl(
  eventId: string,
  url: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const clean = url.trim();
  // Solo http(s); evita javascript:/data: en un link que se muestra público.
  if (clean && !/^https?:\/\//i.test(clean)) {
    return { ok: false, error: "El link debe empezar con http:// o https://" };
  }
  const { error } = await supabase
    .from("calendar_events")
    .update({ ticket_url: clean || null })
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface EventRsvpRow {
  id: string;
  name: string;
  email: string;
  status: string;
  notify_future: boolean;
  created_at: string;
}

export async function listEventRsvps(eventId: string): Promise<EventRsvpRow[]> {
  // RLS: la policy de SELECT solo deja ver RSVPs de eventos propios.
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_rsvps")
    .select("id, name, email, status, notify_future, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EventRsvpRow[];
}

/**
 * Publica/despublica un evento (owner). Genera public_token la primera vez.
 * Devuelve el token vigente.
 */
export async function setEventPublished(
  eventId: string,
  publish: boolean
): Promise<
  | { ok: true; token: string | null; firstPublish: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };

  const { data: ev } = await supabase
    .from("calendar_events")
    .select("id, public_token, type")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ev) return { ok: false, error: "Evento no encontrado" };

  // M12: solo los shows se publican como evento público (no clases, bloqueos,
  // etc.). Guard server-side: alguien podría pegarle a la acción por URL directa.
  if (publish && (ev as { type?: string }).type !== "show") {
    return { ok: false, error: "Solo los shows se pueden publicar como evento." };
  }

  let token = (ev as { public_token: string | null }).public_token;
  // "Primera publicación" = nunca tuvo token. Así republicar no re-avisa.
  const firstPublish = publish && !token;
  const patch: Record<string, unknown> = { is_public: publish };
  if (firstPublish) {
    token = randomBytes(9).toString("base64url");
    patch.public_token = token;
  }
  const { error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", eventId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true, token, firstPublish };
}

/**
 * Avisa por email a los fans que tildaron "avísame" en RSVPs previos de
 * ESTE DJ (cualquier evento), cuando publica uno nuevo. Síncrono + rate-limited;
 * cap 100 (si crece, mover a cron — patrón follow-updates). Devuelve cuántos.
 */
export async function notifyFansOfEvent(eventId: string): Promise<number> {
  if (!isResendConfigured()) return 0;
  const admin = createAdminClient();

  const { data: ev } = await admin
    .from("calendar_events")
    .select("id, user_id, title, start_at, public_token, is_public")
    .eq("id", eventId)
    .maybeSingle();
  if (!ev || !ev.is_public || !ev.public_token) return 0;

  // Eventos de este DJ (para juntar sus RSVPs opt-in).
  const { data: djEvents } = await admin
    .from("calendar_events")
    .select("id")
    .eq("user_id", ev.user_id);
  const ids = (djEvents ?? []).map((e) => (e as { id: string }).id);
  if (ids.length === 0) return 0;

  const { data: rsvps } = await admin
    .from("event_rsvps")
    .select("id, email, name, event_id")
    .eq("notify_future", true)
    .in("event_id", ids)
    .limit(100000); // sin esto el default 1000 cortaba la lista de fans a avisar

  // Distinct por email, excluyendo los de este mismo evento. Guardamos un id de
  // RSVP por fan para armar su link de baja (A4).
  const recipients = new Map<string, { name: string; rsvpId: string }>();
  for (const r of (rsvps ?? []) as {
    id: string;
    email: string;
    name: string;
    event_id: string;
  }[]) {
    if (r.event_id === eventId) continue;
    if (!recipients.has(r.email)) {
      recipients.set(r.email, { name: r.name, rsvpId: r.id });
    }
  }
  if (recipients.size === 0) return 0;

  const { data: dj } = await admin
    .from("dj_profile")
    .select("artist_name")
    .eq("user_id", ev.user_id)
    .maybeSingle();
  const djNameRaw = (dj as { artist_name?: string } | null)?.artist_name ?? "Tu DJ";
  // A2: el nombre del DJ y el título salen en HTML del correo → escapar para
  // que no se puedan inyectar tags/markup en un email que sale de dropgigs.com.
  const djName = escapeHtml(djNameRaw);
  const evTitle = escapeHtml(ev.title ?? "");
  const link = `${SITE}/e/${ev.public_token}`;

  // A3: cap de envíos síncronos. A 600ms c/u, 50 = ~30s (dentro del maxDuration
  // de 60s de la ruta). Si la lista crece, esto debe pasar a un cron
  // (patrón follow-updates); por ahora logueamos la truncación, no la tapamos.
  const SYNC_CAP = 50;
  const all = Array.from(recipients.entries());
  if (all.length > SYNC_CAP) {
    console.warn(
      `notifyFansOfEvent: ${all.length} fans opt-in pero solo se avisó a ${SYNC_CAP} (cap síncrono). Mover a cron.`
    );
  }

  let sent = 0;
  for (const [email, { name, rsvpId }] of all.slice(0, SYNC_CAP)) {
    const fanName = escapeHtml(name ?? "");
    const unsubUrl = `${SITE}/api/unsubscribe?rsvp=${encodeURIComponent(rsvpId)}`;
    const html = wrapEmail({
      title: `${djNameRaw} anunció un nuevo show`,
      preheader: ev.title ?? "",
      content: `<p style="font-size:15px;line-height:1.5;">Hola${
        fanName ? ` ${fanName}` : ""
      },</p><p style="font-size:15px;line-height:1.5;"><strong>${djName}</strong> anunció un nuevo show: <strong>${evTitle}</strong>.</p><p style="margin:24px 0;">${ctaButton(
        "Ver evento y confirmar",
        link
      )}</p>`,
      // A4: link de baja real (apaga notify_future), no solo el header log-only.
      footerReason: `Recibes este email porque pediste que ${djName} te avise de próximos shows. <a href="${unsubUrl}" style="color:#7A7670;text-decoration:underline;">Cancelar avisos</a>.`,
    });
    const res = await sendEmail({
      to: email,
      subject: `${djNameRaw} anunció un nuevo show`,
      html,
      text: `${djNameRaw} anunció un nuevo show: ${ev.title}. Confírmalo acá: ${link}\n\nCancelar avisos: ${unsubUrl}`,
    });
    if (res.ok) {
      sent++;
      await admin.from("usage_events").insert({
        user_id: ev.user_id,
        event: "fan_event_notif_sent",
        page: "/e/[token]",
        metadata: { event_id: eventId, resend_email_id: res.id },
      });
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return sent;
}
