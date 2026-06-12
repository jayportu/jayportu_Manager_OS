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
