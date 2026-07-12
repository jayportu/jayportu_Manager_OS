import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyBookerAccount } from "@/lib/queries/booker";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { AccountSuspendedError } from "@/lib/queries/beta-guard";
import {
  bookerMaxOpenGigs,
  bookerGigCreatePerDay,
  djApplyPerDay,
} from "@/lib/limits";

/** Ventana rolling de 24h como ISO, para caps "por día" confiables en DB. */
function last24hISO(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

export type GigStatus = "open" | "closed";
export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface OpenGig {
  id: string;
  booker_user_id: string;
  organizer_name: string;
  title: string;
  event_date: string | null;
  city: string;
  country: string;
  genre: string;
  budget_clp: number | null;
  description: string;
  application_deadline: string | null;
  status: GigStatus;
  created_at: string;
  updated_at: string;
}
export interface OpenGigWithCount extends OpenGig {
  application_count: number;
}
export interface GigApplication {
  id: string;
  open_gig_id: string;
  dj_user_id: string;
  dj_display_name: string;
  dj_slug: string;
  message: string;
  availability: string;
  status: ApplicationStatus;
  created_at: string;
  viewed_at: string | null;
}
export interface CreateGigInput {
  title: string;
  event_date?: string | null;
  city: string;
  country?: string;
  genre?: string;
  budget_clp?: number | null;
  description?: string;
  application_deadline?: string | null;
}

const GIG_COLS =
  "id, booker_user_id, organizer_name, title, event_date, city, country, genre, budget_clp, description, application_deadline, status, created_at, updated_at";
const APP_COLS =
  "id, open_gig_id, dj_user_id, dj_display_name, dj_slug, message, availability, status, created_at, viewed_at";

async function requireUser() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

// ─── Booker ───────────────────────────────────────────────────────────
export async function listMyGigs(): Promise<OpenGigWithCount[]> {
  const { supabase, user } = await getCachedUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("open_gigs")
    .select(GIG_COLS)
    .eq("booker_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];
  const gigs = (data ?? []) as OpenGig[];
  if (gigs.length === 0) return [];
  // Conteo de postulantes por gig (una query, agrupado en JS)
  const ids = gigs.map((g) => g.id);
  const { data: apps } = await supabase
    .from("gig_applications")
    .select("open_gig_id")
    .in("open_gig_id", ids);
  const counts = new Map<string, number>();
  for (const a of (apps ?? []) as { open_gig_id: string }[]) {
    counts.set(a.open_gig_id, (counts.get(a.open_gig_id) ?? 0) + 1);
  }
  return gigs.map((g) => ({ ...g, application_count: counts.get(g.id) ?? 0 }));
}

export async function getMyGig(id: string): Promise<OpenGig | null> {
  const { supabase, user } = await getCachedUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("open_gigs")
    .select(GIG_COLS)
    .eq("id", id)
    .eq("booker_user_id", user.id)
    .maybeSingle();
  if (error) return null;
  return (data as OpenGig) ?? null;
}

export async function createGig(input: CreateGigInput): Promise<string> {
  const { supabase, user } = await requireUser();
  const booker = await getMyBookerAccount();
  if (!booker) throw new Error("Solo cuentas de booker pueden publicar.");
  // F0 — defensa en profundidad: un booker suspendido/baneado no publica aunque
  // el guard de la action fallara (la RLS de 0072 lo blindará también en DB).
  if (booker.account_status !== "active") {
    throw new AccountSuspendedError(booker.account_status === "banned");
  }
  if (!booker.verified_at) throw new Error("Tu cuenta debe estar verificada para publicar convocatorias.");

  // Cap de convocatorias abiertas simultáneas (anti-spam de marketplace).
  const maxOpen = bookerMaxOpenGigs();
  const { count: openCount } = await supabase
    .from("open_gigs")
    .select("id", { count: "exact", head: true })
    .eq("booker_user_id", user.id)
    .eq("status", "open");
  if ((openCount ?? 0) >= maxOpen) {
    throw new Error(
      `Alcanzaste el máximo de ${maxOpen} convocatorias abiertas. Cierra alguna para publicar otra.`
    );
  }

  // Rate limit de creación por día (rolling 24h; conteo confiable en DB).
  const { count: dayCount } = await supabase
    .from("open_gigs")
    .select("id", { count: "exact", head: true })
    .eq("booker_user_id", user.id)
    .gte("created_at", last24hISO());
  if ((dayCount ?? 0) >= bookerGigCreatePerDay()) {
    throw new Error(
      "Alcanzaste el máximo de convocatorias por día. Intenta de nuevo mañana."
    );
  }

  const { data, error } = await supabase
    .from("open_gigs")
    .insert({
      booker_user_id: user.id,
      organizer_name: booker.full_name || "Organizador",
      title: input.title.trim().slice(0, 160),
      event_date: input.event_date || null,
      city: (input.city || booker.city || "").trim(),
      country: (input.country || booker.country || "").trim(),
      genre: (input.genre || "").trim(),
      budget_clp: input.budget_clp ?? null,
      description: (input.description || "").trim().slice(0, 4000),
      application_deadline: input.application_deadline || null,
      status: "open",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // F1 — evento de funnel: convocatoria publicada. Best-effort.
  try {
    await supabase.from("usage_events").insert({
      user_id: user.id,
      event: "booker_gig_created",
      page: "/booker/convocatorias",
      metadata: {
        city: (input.city || booker.city || "").trim() || null,
        genre: (input.genre || "").trim() || null,
        has_budget: input.budget_clp != null,
        has_deadline: !!input.application_deadline,
      },
    });
  } catch {
    /* tracking best-effort */
  }

  return (data as { id: string }).id;
}

export async function closeGig(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("open_gigs")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("booker_user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function listApplicationsForGig(gigId: string): Promise<GigApplication[]> {
  const { supabase, user } = await getCachedUser();
  if (!user) return [];
  // RLS ya restringe al booker dueño; filtramos por gig.
  const { data, error } = await supabase
    .from("gig_applications")
    .select(APP_COLS)
    .eq("open_gig_id", gigId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as GigApplication[];
}

export async function markApplicationViewed(id: string): Promise<void> {
  const { supabase } = await requireUser();
  await supabase
    .from("gig_applications")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", id)
    .is("viewed_at", null); // idempotente
}

export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus
): Promise<{ djUserId: string; gigTitle: string }> {
  const { supabase } = await requireUser();
  // El UPDATE es la fuente de verdad: si RLS bloquea la escritura (p.ej. el DJ
  // postulante, que solo puede leer), PostgREST no devuelve error, solo 0 filas.
  // Por eso exigimos la fila actualizada en vez de confiar en un SELECT previo.
  const { data: app, error } = await supabase
    .from("gig_applications")
    .update({ status })
    .eq("id", id)
    .eq("status", "pending") // solo se decide una postulación pendiente (evita flip-flop / re-notificar)
    .select("id, dj_user_id, open_gig_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) throw new Error("La postulación ya fue decidida o no está disponible.");
  const { data: gig } = await supabase
    .from("open_gigs")
    .select("title")
    .eq("id", (app as { open_gig_id: string }).open_gig_id)
    .single();
  return {
    djUserId: (app as { dj_user_id: string }).dj_user_id,
    gigTitle: (gig as { title: string } | null)?.title ?? "una convocatoria",
  };
}

// ─── DJ ────────────────────────────────────────────────────────────────
export async function listOpenGigs(f?: {
  city?: string;
  genre?: string;
}): Promise<OpenGig[]> {
  const { supabase, user } = await getCachedUser();
  if (!user) return [];
  const today = new Date().toISOString().slice(0, 10);
  let q = supabase
    .from("open_gigs")
    .select(GIG_COLS)
    .eq("status", "open")
    .or(`application_deadline.is.null,application_deadline.gte.${today}`);
  if (f?.city && f.city.trim()) q = q.ilike("city", `%${f.city.trim()}%`);
  if (f?.genre && f.genre.trim()) q = q.ilike("genre", `%${f.genre.trim()}%`);
  const { data, error } = await q.order("event_date", { ascending: true, nullsFirst: false }).limit(200);
  if (error) return [];
  return (data ?? []) as OpenGig[];
}

export async function getOpenGig(id: string): Promise<OpenGig | null> {
  const { supabase, user } = await getCachedUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("open_gigs")
    .select(GIG_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) return null;
  return (data as OpenGig) ?? null;
}

export async function applyToGig(
  gigId: string,
  input: { message: string; availability: string }
): Promise<{ bookerUserId: string; gigTitle: string; djName: string }> {
  const { supabase, user } = await requireUser();
  const gig = await getOpenGig(gigId);
  if (!gig) throw new Error("Convocatoria no encontrada.");
  if (gig.status !== "open") throw new Error("Esta convocatoria ya no recibe postulaciones.");

  // Rate limit de postulaciones por día (rolling 24h) — además del unique 1/gig.
  const { count: appsToday } = await supabase
    .from("gig_applications")
    .select("id", { count: "exact", head: true })
    .eq("dj_user_id", user.id)
    .gte("created_at", last24hISO());
  if ((appsToday ?? 0) >= djApplyPerDay()) {
    throw new Error(
      "Alcanzaste el máximo de postulaciones por día. Intenta de nuevo mañana."
    );
  }

  const profile = await getMyProfile();
  const djName = profile?.artist_name || "DJ";
  const { error } = await supabase.from("gig_applications").insert({
    open_gig_id: gigId,
    dj_user_id: user.id,
    dj_display_name: djName,
    dj_slug: profile?.public_slug || "",
    message: input.message.trim().slice(0, 2000),
    availability: input.availability.trim().slice(0, 500),
    status: "pending",
  });
  if (error) {
    if (error.code === "23505") throw new Error("Ya postulaste a esta convocatoria.");
    throw new Error(error.message);
  }
  return { bookerUserId: gig.booker_user_id, gigTitle: gig.title, djName };
}

export async function listMyApplications(): Promise<
  Array<GigApplication & { gig: OpenGig | null }>
> {
  const { supabase, user } = await getCachedUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("gig_applications")
    .select(APP_COLS)
    .eq("dj_user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return [];
  const apps = (data ?? []) as GigApplication[];
  if (apps.length === 0) return [];
  const gigIds = Array.from(new Set(apps.map((a) => a.open_gig_id)));
  // Admin: RLS en open_gigs solo permite leer gigs "open" o propios del booker,
  // así que una vez que el booker cierra el gig, el DJ pierde acceso vía cliente
  // user-scoped aunque su postulación (ya filtrada por dj_user_id arriba) siga
  // referenciándolo. El DJ es dueño de esas filas, así que es seguro resolverlas.
  const admin = createAdminClient();
  const { data: gigs } = await admin
    .from("open_gigs")
    .select(GIG_COLS)
    .in("id", gigIds);
  const byId = new Map<string, OpenGig>();
  for (const g of (gigs ?? []) as OpenGig[]) byId.set(g.id, g);
  return apps.map((a) => ({ ...a, gig: byId.get(a.open_gig_id) ?? null }));
}

export async function withdrawApplication(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("gig_applications")
    .delete()
    .eq("id", id)
    .eq("dj_user_id", user.id);
  if (error) throw new Error(error.message);
}
