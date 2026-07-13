import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Pulso de beta: el embudo que /admin/trafico no cubre (ése mide tráfico→cuenta;
 * éste mide qué pasa con DJs y bookers DESPUÉS de llegar). Solo lecturas (count
 * exacto, head:true → no transfiere filas). Volumen beta = chico.
 *
 * Embudo de oferta: aprobados (beta_requests) → registrados (dj_profile) →
 * perfil completo → con evento público. + demanda (bookers, bookings, pitches,
 * favoritos) + engagement (eventos públicos, RSVPs). Más los deltas de la
 * ventana (lo "nuevo esta semana") para el digest.
 */

export interface Pulso {
  days: number;
  // Embudo de oferta (acumulado)
  approved: number; // beta_requests (pipeline de invitados/aprobados)
  registered: number; // dj_profile activos
  onboarded: number; // perfil completo (onboarding_completed_at)
  withEvent: number; // DJs distintos con ≥1 evento público
  // Demanda (acumulado)
  bookers: number;
  publicEvents: number;
  // Nuevo en la ventana
  newDjs: number;
  newOnboarded: number;
  newBookers: number;
  bookings: number; // solicitudes de booking en la ventana
  pitches: number; // pitches a venues en la ventana
  favorites: number; // favoritos guardados en la ventana
  rsvps: number; // RSVPs de fans en la ventana
}

const n = (r: { count: number | null }) => r.count ?? 0;

/**
 * F2c · Embudo del lado booker. Acumulado por tablas (robusto ante datos viejos
 * sin eventos) + movimiento de la ventana desde usage_events booker_* y visitas
 * de captación desde site_events. Degrada a 0 si una columna aún no existe (p.ej.
 * verification_requested_at pre-0079): las queries devuelven error+count null.
 */
export interface BookerFunnel {
  days: number;
  // Embudo (acumulado)
  registered: number; // booker_accounts activos
  verified: number; // + verified_at
  withRequest: number; // bookers distintos con ≥1 solicitud enviada
  withGig: number; // bookers distintos con ≥1 convocatoria publicada
  verifyPending: number; // cola self-service (pidieron, sin verificar)
  // Movimiento en la ventana (usage_events booker_*)
  evSignup: number;
  evVerified: number;
  evContact: number;
  evGig: number;
  // Captación (site_events, ventana)
  visitsLanding: number; // /bookers
  visitsSignup: number; // /signup/booker
}

export async function getBookerFunnel(days = 7): Promise<BookerFunnel> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const HEAD = { count: "exact" as const, head: true };

  const [
    registered,
    verified,
    verifyPending,
    evSignup,
    evVerified,
    evContact,
    evGig,
    visitsLanding,
    visitsSignup,
    reqRows,
    gigRows,
  ] = await Promise.all([
    admin.from("booker_accounts").select("user_id", HEAD).eq("account_status", "active"),
    admin
      .from("booker_accounts")
      .select("user_id", HEAD)
      .eq("account_status", "active")
      .not("verified_at", "is", null),
    admin
      .from("booker_accounts")
      .select("user_id", HEAD)
      .eq("account_status", "active")
      .not("verification_requested_at", "is", null)
      .is("verified_at", null),
    admin.from("usage_events").select("id", HEAD).eq("event", "booker_signup_completed").gte("created_at", cutoff),
    admin.from("usage_events").select("id", HEAD).eq("event", "booker_verified").gte("created_at", cutoff),
    admin.from("usage_events").select("id", HEAD).eq("event", "booker_contact_viewed").gte("created_at", cutoff),
    admin.from("usage_events").select("id", HEAD).eq("event", "booker_gig_created").gte("created_at", cutoff),
    admin.from("site_events").select("id", HEAD).eq("path", "/bookers").gte("created_at", cutoff),
    admin.from("site_events").select("id", HEAD).like("path", "/signup/booker%").gte("created_at", cutoff),
    // Bookers distintos con actividad (count head no deduplica → traemos ids).
    admin.from("booking_form_submissions").select("booker_user_id").not("booker_user_id", "is", null).limit(10000),
    admin.from("open_gigs").select("booker_user_id").limit(10000),
  ]);

  const reqSet = new Set(
    ((reqRows.data ?? []) as { booker_user_id: string | null }[])
      .map((r) => r.booker_user_id)
      .filter(Boolean)
  );
  const gigSet = new Set(
    ((gigRows.data ?? []) as { booker_user_id: string | null }[])
      .map((r) => r.booker_user_id)
      .filter(Boolean)
  );

  return {
    days,
    registered: n(registered),
    verified: n(verified),
    withRequest: reqSet.size,
    withGig: gigSet.size,
    verifyPending: n(verifyPending),
    evSignup: n(evSignup),
    evVerified: n(evVerified),
    evContact: n(evContact),
    evGig: n(evGig),
    visitsLanding: n(visitsLanding),
    visitsSignup: n(visitsSignup),
  };
}

export async function getPulso(days = 7): Promise<Pulso> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const HEAD = { count: "exact" as const, head: true };

  const [
    approved,
    registered,
    onboarded,
    bookers,
    newDjs,
    newOnboarded,
    newBookers,
    bookings,
    pitches,
    favorites,
    rsvps,
    pubEv,
  ] = await Promise.all([
    admin.from("beta_requests").select("id", HEAD),
    admin.from("dj_profile").select("user_id", HEAD).eq("account_status", "active"),
    admin
      .from("dj_profile")
      .select("user_id", HEAD)
      .eq("account_status", "active")
      .not("onboarding_completed_at", "is", null),
    admin.from("booker_accounts").select("user_id", HEAD),
    admin.from("dj_profile").select("user_id", HEAD).gte("created_at", cutoff),
    admin.from("dj_profile").select("user_id", HEAD).gte("onboarding_completed_at", cutoff),
    admin.from("booker_accounts").select("user_id", HEAD).gte("created_at", cutoff),
    admin.from("booking_form_submissions").select("id", HEAD).gte("created_at", cutoff),
    admin.from("venue_pitches").select("id", HEAD).gte("created_at", cutoff),
    admin.from("booker_favorites").select("id", HEAD).gte("created_at", cutoff),
    admin.from("event_rsvps").select("id", HEAD).gte("created_at", cutoff),
    // DJs distintos con evento público (count head no deduplica → traemos ids)
    admin.from("calendar_events").select("user_id").eq("is_public", true).not("public_token", "is", null).limit(5000),
  ]);

  const pubRows = (pubEv.data ?? []) as { user_id: string }[];
  const withEvent = new Set(pubRows.map((e) => e.user_id)).size;

  return {
    days,
    approved: n(approved),
    registered: n(registered),
    onboarded: n(onboarded),
    withEvent,
    bookers: n(bookers),
    publicEvents: pubRows.length,
    newDjs: n(newDjs),
    newOnboarded: n(newOnboarded),
    newBookers: n(newBookers),
    bookings: n(bookings),
    pitches: n(pitches),
    favorites: n(favorites),
    rsvps: n(rsvps),
  };
}
