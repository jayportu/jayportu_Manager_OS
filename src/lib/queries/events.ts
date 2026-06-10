import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { wrapEmail, ctaButton } from "@/lib/email/templates";

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

/** Lee un evento público por su token. null si no existe o no está publicado. */
export async function getEventByToken(
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

  const { count } = await admin
    .from("event_rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", ev.id);

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
    .select("id")
    .eq("public_token", input.token)
    .eq("is_public", true)
    .maybeSingle();
  if (!ev) return { ok: false, error: "Evento no encontrado" };

  // Upsert manual (dedupe por evento+email; email ya en minúscula).
  const { data: existing } = await admin
    .from("event_rsvps")
    .select("id")
    .eq("event_id", ev.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    await admin
      .from("event_rsvps")
      .update({ name, status, notify_future: input.notifyFuture })
      .eq("id", (existing as { id: string }).id);
  } else {
    const { error } = await admin.from("event_rsvps").insert({
      event_id: ev.id,
      name,
      email,
      status,
      notify_future: input.notifyFuture,
    });
    if (error) return { ok: false, error: error.message };
  }

  const { count } = await admin
    .from("event_rsvps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", ev.id);

  return { ok: true, going_count: count ?? 0 };
}

// ─── Owner-side (el DJ gestiona su evento) ────────────────────────────

export interface MyEventInfo {
  id: string;
  title: string;
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
    .select("id, title, start_at, location, type, is_public, public_token, ticket_url")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as MyEventInfo) ?? null;
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
    .select("id, public_token")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ev) return { ok: false, error: "Evento no encontrado" };

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
    .select("email, name, event_id")
    .eq("notify_future", true)
    .in("event_id", ids);

  // Distinct por email, excluyendo los de este mismo evento.
  const recipients = new Map<string, string>();
  for (const r of (rsvps ?? []) as {
    email: string;
    name: string;
    event_id: string;
  }[]) {
    if (r.event_id === eventId) continue;
    if (!recipients.has(r.email)) recipients.set(r.email, r.name);
  }
  if (recipients.size === 0) return 0;

  const { data: dj } = await admin
    .from("dj_profile")
    .select("artist_name")
    .eq("user_id", ev.user_id)
    .maybeSingle();
  const djName = (dj as { artist_name?: string } | null)?.artist_name ?? "Tu DJ";
  const link = `${SITE}/e/${ev.public_token}`;

  let sent = 0;
  for (const [email, name] of Array.from(recipients.entries()).slice(0, 100)) {
    const html = wrapEmail({
      title: `${djName} anunció un nuevo show`,
      preheader: ev.title,
      content: `<p style="font-size:15px;line-height:1.5;">Hola${
        name ? ` ${name}` : ""
      },</p><p style="font-size:15px;line-height:1.5;"><strong>${djName}</strong> anunció un nuevo show: <strong>${ev.title}</strong>.</p><p style="margin:24px 0;">${ctaButton(
        "Ver evento y confirmar",
        link
      )}</p>`,
      footerReason: `Recibes este email porque pediste que ${djName} te avise de próximos shows.`,
    });
    const res = await sendEmail({
      to: email,
      subject: `${djName} anunció un nuevo show`,
      html,
      text: `${djName} anunció un nuevo show: ${ev.title}. Confírmalo acá: ${link}`,
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
