import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DjProfile,
  PresskitEvent,
  PresskitEventType,
  BookingSubmission,
  BookingStatus,
} from "@/types/database";

// ─── Public: leer profile por slug (sin auth) ─────────────────────────
export async function getProfileBySlug(slug: string): Promise<DjProfile | null> {
  // Usamos admin client porque la página es pública (sin sesión).
  // El RLS de dj_profile solo permite SELECT al owner, así que sin admin
  // un visitante anónimo no podría leer. Limitamos a campos seguros.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dj_profile")
    // Fix B8: select ACOTADO a columnas públicas (no `*`). Esta página es
    // pública y usa service_role (saltea RLS), así que no traemos columnas
    // sensibles (is_admin, verified_by, beta_status, account_status*,
    // auto_post_webhook_url, etc.) aunque hoy no se filtren al cliente.
    .select(
      "user_id, public_slug, artist_name, tagline, bio_short, bio_long, genres, city, country, avatar_url, hero_image_url, logo_url, instagram_url, soundcloud_url, youtube_url, spotify_url, website, public_email, whatsapp, tech_rider_ideal, tech_rider_alt, hospitality, press_kit_pdf_url, featured_sets, brands_worked, aliases, record_label, show_fee, fee_min, fee_max, verified_at, verifications, available_from, available_until, available_note"
    )
    .eq("public_slug", slug)
    .single();
  if (error) {
    if (error.code !== "PGRST116") {
      console.error("getProfileBySlug error:", error);
    }
    return null;
  }
  return data as DjProfile;
}

// ─── Tracking (insert público vía admin) ──────────────────────────────
export async function trackEvent(input: {
  user_id: string;
  event: PresskitEventType;
  referrer?: string;
  user_agent?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("presskit_events").insert({
    user_id: input.user_id,
    event: input.event,
    referrer: input.referrer || "",
    user_agent: input.user_agent || "",
    country: input.country || "",
    metadata: input.metadata || {},
  });
  if (error) {
    console.error("trackEvent error:", error);
  }
}

// ─── Booking submissions ──────────────────────────────────────────────
export async function createBookingSubmission(input: {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  event_type?: string;
  event_date?: string | null;
  venue?: string;
  message?: string;
  referrer?: string;
  user_agent?: string;
  /** Bloque B — Si el booker está logueado, su user_id para link directo. */
  booker_user_id?: string | null;
}): Promise<BookingSubmission | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_form_submissions")
    .insert({
      user_id: input.user_id,
      name: input.name,
      email: input.email || "",
      phone: input.phone || "",
      event_type: input.event_type || "",
      event_date: input.event_date || null,
      venue: input.venue || "",
      message: input.message || "",
      referrer: input.referrer || "",
      user_agent: input.user_agent || "",
      booker_user_id: input.booker_user_id || null,
    })
    .select("*")
    .single();
  if (error) {
    console.error("createBookingSubmission error:", error);
    return null;
  }
  return data as BookingSubmission;
}

/**
 * Bloque B — Lookup público por view_token (sin auth).
 * Devuelve booking + datos básicos del DJ para mostrar la vista /b/[token].
 *
 * Dos queries (no usamos FK join porque booking.user_id apunta a auth.users
 * y dj_profile.user_id es la otra side; relación lógica, no FK directa).
 */
export async function getBookingByViewToken(token: string): Promise<
  | (BookingSubmission & {
      dj_artist_name: string;
      dj_public_slug: string;
      dj_logo_url: string;
    })
  | null
> {
  const admin = createAdminClient();

  const { data: booking, error } = await admin
    .from("booking_form_submissions")
    .select("*")
    .eq("view_token", token)
    .maybeSingle();
  if (error || !booking) return null;

  const b = booking as BookingSubmission;
  const { data: dj } = await admin
    .from("dj_profile")
    .select("artist_name, public_slug, logo_url")
    .eq("user_id", b.user_id)
    .maybeSingle();

  return {
    ...b,
    dj_artist_name: (dj as { artist_name?: string } | null)?.artist_name ?? "DJ",
    dj_public_slug: (dj as { public_slug?: string } | null)?.public_slug ?? "",
    dj_logo_url: (dj as { logo_url?: string } | null)?.logo_url ?? "",
  };
}

// ─── Owner-only queries (con session) ────────────────────────────────
async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listEvents(days = 7): Promise<PresskitEvent[]> {
  const { supabase, user } = await getUserOrThrow();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("presskit_events")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return [];
  return data as PresskitEvent[];
}

export async function getEventsSummary(days = 7): Promise<{
  total: number;
  byEvent: Record<string, number>;
}> {
  const events = await listEvents(days);
  const byEvent: Record<string, number> = {};
  for (const e of events) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
  }
  return { total: events.length, byEvent };
}

export async function listBookings(
  status?: BookingStatus
): Promise<BookingSubmission[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("booking_form_submissions")
    .select("*")
    .eq("user_id", user.id);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return [];
  return data as BookingSubmission[];
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("booking_form_submissions")
    .update({ status })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Sprint 20 — Cambiar status con auto-actions según workflow.
 *
 *  - status='cotizado': graba quoted_amount_clp + crea follow_up auto
 *    para +3 días con nota "Recontactar [name] - cotizado $X sin respuesta".
 *  - status='agendado': crea calendar_event con monto y payment_status='pending'.
 *
 * Devuelve los ids generados (si los hay).
 */
export async function updateBookingWorkflow(
  id: string,
  patch: {
    status: BookingStatus;
    quoted_amount_clp?: number | null;
    notes_internal?: string;
    event_date?: string | null;
  }
): Promise<{ followUpId?: string; calendarEventId?: string }> {
  const { supabase, user } = await getUserOrThrow();

  // 1. Leer booking actual
  const { data: booking, error: readErr } = await supabase
    .from("booking_form_submissions")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);
  const b = booking as BookingSubmission;

  const updateObj: Record<string, unknown> = { status: patch.status };
  if (patch.quoted_amount_clp !== undefined) {
    updateObj.quoted_amount_clp = patch.quoted_amount_clp;
  }
  if (patch.notes_internal !== undefined) {
    updateObj.notes_internal = patch.notes_internal;
  }

  const result: { followUpId?: string; calendarEventId?: string } = {};

  // Auto-action (Deuda #04): cuando un booking pasa por primera vez a un
  // estado "trabajado" (leido en adelante), promover al booker a contact
  // del CRM si todavía no existe. Antes esto solo se hacía en cotizado;
  // ahora arranca antes para que el CRM tenga el lead desde el primer
  // engagement del DJ.
  const TRABAJADO_STATES = new Set([
    "leido",
    "respondido",
    "cotizado",
    "contraofertado",
    "agendado",
  ]);
  if (
    TRABAJADO_STATES.has(patch.status as string) &&
    !b.created_contact_id &&
    b.name
  ) {
    const { data: contact } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        name: b.name,
        email: b.email || "",
        whatsapp: b.phone || "",
        source: "booking_form",
        status: "negociando",
        notes: b.message || "",
      })
      .select("id")
      .single();
    if (contact) {
      const contactId = (contact as { id: string }).id;
      updateObj.created_contact_id = contactId;
      // Actualizar b localmente para que los handlers de cotizado/agendado
      // de abajo vean el contact_id recién creado.
      b.created_contact_id = contactId;
    }
  }

  // Auto-action: cotizado → crear follow_up para +3 días
  if (
    patch.status === "cotizado" &&
    b.status !== "cotizado" &&
    !b.follow_up_id
  ) {
    const contactId = b.created_contact_id;
    if (contactId) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 3);
      const amount = patch.quoted_amount_clp ?? b.quoted_amount_clp;
      const amountLabel = amount
        ? `$${amount.toLocaleString("es-CL")}`
        : "monto cotizado";
      const { data: fu } = await supabase
        .from("follow_ups")
        .insert({
          user_id: user.id,
          contact_id: contactId,
          due_at: dueAt.toISOString(),
          note: `Recontactar ${b.name} — ${amountLabel} sin respuesta`,
          priority: "alta",
        })
        .select("id")
        .single();
      if (fu) {
        result.followUpId = (fu as { id: string }).id;
        updateObj.follow_up_id = result.followUpId;
      }
    }
    updateObj.quoted_at = new Date().toISOString();
  }

  // Auto-action: agendado → crear calendar_event
  if (
    patch.status === "agendado" &&
    b.status !== "agendado" &&
    !b.calendar_event_id
  ) {
    // Necesita una fecha. Usar event_date del form (puede ser null).
    const eventDate = patch.event_date ?? b.event_date;
    if (eventDate) {
      const startAt = new Date(`${eventDate}T22:00:00`);
      const endAt = new Date(`${eventDate}T26:00:00`); // 4h gig default
      endAt.setHours(endAt.getHours());
      const amount = patch.quoted_amount_clp ?? b.quoted_amount_clp;
      const { data: ev } = await supabase
        .from("calendar_events")
        .insert({
          user_id: user.id,
          type: "show",
          title: `${b.name}${b.venue ? ` · ${b.venue}` : ""}`,
          description: b.message || "",
          location: b.venue || "",
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          contact_id: b.created_contact_id,
          sync_state: "local_only",
          amount_clp: amount,
          payment_status: amount && amount > 0 ? "pending" : "none",
          document_type: "none",
        })
        .select("id")
        .single();
      if (ev) {
        result.calendarEventId = (ev as { id: string }).id;
        updateObj.calendar_event_id = result.calendarEventId;
      }
    }
    updateObj.agendado_at = new Date().toISOString();

    // RA-3 Fase 2 — Emit "show_scheduled" event para que el cron
    // notifique a los followers del DJ con notify_email=true. No bloquea
    // la transición si falla.
    try {
      await supabase.from("dj_update_events").insert({
        dj_user_id: user.id,
        type: "show_scheduled",
        payload: {
          booking_id: b.id,
          title: `${b.name}${b.venue ? ` · ${b.venue}` : ""}`,
          venue: b.venue || null,
          event_date: patch.event_date ?? b.event_date ?? null,
        },
      });
    } catch (e) {
      console.error("dj_update_events insert failed:", e);
    }
  }

  // Auto-action: si hay follow_up activo de la serie y el booking pasa a
  // 'agendado' o 'rechazado', cerrar el follow_up.
  if (
    (patch.status === "agendado" || patch.status === "rechazado") &&
    b.follow_up_id
  ) {
    await supabase
      .from("follow_ups")
      .update({ done: true, done_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("id", b.follow_up_id)
      .eq("done", false);
  }

  // Persistir cambios
  const { error: updateErr } = await supabase
    .from("booking_form_submissions")
    .update(updateObj)
    .eq("user_id", user.id)
    .eq("id", id);
  if (updateErr) throw new Error(updateErr.message);

  return result;
}

export async function updateProfileSlug(slug: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  // Sanitizar slug
  const clean = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!clean) throw new Error("Slug inválido");

  const { error } = await supabase
    .from("dj_profile")
    .update({ public_slug: clean })
    .eq("user_id", user.id);
  if (error) {
    if (error.code === "23505") {
      throw new Error("Ese slug ya está en uso. Elige otro.");
    }
    throw new Error(error.message);
  }
}
