/**
 * Sprint RA-1 — Stats públicos de gigs de un DJ.
 *
 * Para el press kit `/p/[slug]` (sin auth) usamos service_role: bypassea
 * RLS de calendar_events. Mismo patrón que listPublicRiderItems.
 *
 * Output diseñado para ser data-driven: si el DJ no tiene shows, el caller
 * cae al fallback de stats actuales (géneros / rider / base). Si sí tiene,
 * mostramos SHOWS · LUGARES · DESDE + sección "Próximas fechas".
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicUpcomingGig {
  id: string;
  startAt: string;
  title: string;
  location: string;
}

export interface PublicGigStats {
  /** Shows realizados (type='show' con start_at < now). */
  showsPasados: number;
  /** Lugares distintos donde tocó (normalizando case y trimming). */
  lugaresDistintos: number;
  /** Año del primer show (cualquier estado). null si nunca tocó. */
  desdeAño: number | null;
  /** Próximos shows (start_at >= now, ordenados asc, máx 5). */
  proximos: PublicUpcomingGig[];
}

const PROXIMOS_LIMIT = 5;

export async function getPublicGigStats(
  userId: string
): Promise<PublicGigStats> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("calendar_events")
    .select("id, start_at, title, location")
    .eq("user_id", userId)
    .eq("type", "show")
    .order("start_at", { ascending: true });

  const empty: PublicGigStats = {
    showsPasados: 0,
    lugaresDistintos: 0,
    desdeAño: null,
    proximos: [],
  };

  if (error || !data || data.length === 0) return empty;

  const now = Date.now();
  let showsPasados = 0;
  const lugaresSet = new Set<string>();
  let primerShowMs = Infinity;
  const proximos: PublicUpcomingGig[] = [];

  for (const row of data) {
    const startMs = new Date(row.start_at as string).getTime();
    if (startMs < primerShowMs) primerShowMs = startMs;

    const loc = (row.location as string | null)?.trim();
    if (loc) lugaresSet.add(loc.toLowerCase());

    if (startMs < now) {
      showsPasados += 1;
    } else if (proximos.length < PROXIMOS_LIMIT) {
      proximos.push({
        id: row.id as string,
        startAt: row.start_at as string,
        title: (row.title as string) || "Show",
        location: (row.location as string) || "",
      });
    }
  }

  const desdeAño =
    primerShowMs === Infinity ? null : new Date(primerShowMs).getFullYear();

  return {
    showsPasados,
    lugaresDistintos: lugaresSet.size,
    desdeAño,
    proximos,
  };
}
