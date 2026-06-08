/**
 * Sprint 20 — Directorio público de DJs (`/dj`).
 *
 * Usa service_role (admin client) porque `/dj` no requiere auth. RLS no aplica
 * para queries server-side; filtramos manualmente hidden_from_directory=false +
 * onboarding_completed_at IS NOT NULL para no exponer perfiles incompletos.
 *
 * EGRESS (2026-06-04): para no pegarle a la DB en CADA carga de /dj — sobre
 * todo cuando bots crawlean las variantes ?genres=/?city= — la lectura base
 * (todos los DJs públicos) se cachea con `unstable_cache` (5 min) y TODO el
 * filtrado (género, ciudad, búsqueda, disponibilidad) se hace en memoria. Las
 * tres funciones públicas comparten esa única lectura cacheada → máx 1 query
 * a la DB cada 5 min sin importar cuántas URLs filtradas se carguen.
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCompleteness } from "@/lib/match/completeness";
import type { DjProfile } from "@/types/database";

export interface PublicDjProfile {
  user_id: string;
  artist_name: string;
  tagline: string;
  bio_short: string;
  genres: string[];
  city: string;
  country: string;
  logo_url: string;
  /** Foto de perfil cuadrada (subida desde /perfil). Preferida para el card del directorio (aspect-square). */
  avatar_url: string;
  /** Imagen hero rectangular del press kit. Fallback si no hay avatar_url. */
  hero_image_url: string;
  public_slug: string;
  available_from: string | null;
  available_until: string | null;
  available_note: string;
  /** Calculado server-side a partir de las fechas y today */
  is_available_now: boolean;
  /** Verificado por admin (Fase 1 · 1A). */
  is_verified: boolean;
  /** DROP Pick destacado (RA-2A) + prioridad de orden. */
  is_drop_pick: boolean;
  drop_pick_priority: number;
  /** Tarifa referencial (Fase 1 · 1E). Solo relevante si show_fee. CLP. */
  show_fee: boolean;
  fee_min: number | null;
  fee_max: number | null;
  /** Sets destacados (Fase 1 · 1B). URLs SoundCloud/Mixcloud/YouTube. */
  featured_sets: string[];
  /** Completitud del perfil 0–100 (Smart Match). Más completo → más arriba. */
  completeness: number;
}

export interface ListDirectoryParams {
  search?: string;
  city?: string;
  country?: string;
  /** Géneros que el DJ tiene (al menos uno coincide → match). */
  genres?: string[];
  /** Si true, solo DJs disponibles HOY. */
  onlyAvailable?: boolean;
  /** Presupuesto del booker (CLP): excluye DJs cuyo fee_min publicado lo supera. */
  budget?: number;
  /** Sort: 'available' (disponibles primero) o 'name' (alfabético). */
  sort?: "available" | "name";
  limit?: number;
}

function calcIsAvailable(
  from: string | null,
  until: string | null,
  checkDate?: string
): boolean {
  if (!from) return false;
  // YYYY-MM-DD. Default: hoy (UTC). Smart Match pasa la fecha del evento.
  const date = checkDate ?? new Date().toISOString().slice(0, 10);
  if (date < from) return false;
  if (until && date > until) return false;
  return true;
}

/**
 * Lectura base CACHEADA: todos los DJs públicos del directorio, sin filtros de
 * params. revalidate 300s → la DB se consulta como máximo cada 5 min. El
 * `is_available_now` NO se cachea acá (depende de today) — se recalcula por
 * request en `listPublicDjs`.
 */
export const getPublicDjsBase = unstable_cache(
  async (): Promise<PublicDjProfile[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("dj_profile")
      .select(
        // Los campos extra (bio_long, redes, brands_worked, aliases, etc.) se
        // traen SOLO para calcular `completeness`; no se exponen en el objeto
        // cacheado (no engordan el payload) — ver el .map de abajo.
        "user_id, artist_name, tagline, bio_short, bio_long, genres, city, country, logo_url, avatar_url, hero_image_url, public_slug, available_from, available_until, available_note, verified_at, is_drop_pick, drop_pick_priority, show_fee, fee_min, fee_max, featured_sets, brands_worked, aliases, record_label, instagram_url, soundcloud_url, youtube_url, spotify_url, website, public_email, whatsapp, onboarding_completed_at, hidden_from_directory"
      )
      .eq("hidden_from_directory", false)
      .not("onboarding_completed_at", "is", null)
      .not("public_slug", "is", null)
      .not("artist_name", "is", null)
      // Orden estable para que el tope sea determinista (no orden natural de PG)
      // y subimos el cap a 2000 — el filtrado/orden real se hace en memoria.
      // (La campaña apunta a ~861 DJs; cuando se acerque a 2000, paginar.)
      .order("created_at", { ascending: false })
      .limit(2000);

    if (error) {
      console.error("getPublicDjsBase error:", error);
      return [];
    }

    return (data ?? []).map((row: Partial<DjProfile>) => ({
      user_id: row.user_id as string,
      artist_name: row.artist_name ?? "",
      tagline: row.tagline ?? "",
      bio_short: row.bio_short ?? "",
      genres: row.genres ?? [],
      city: row.city ?? "",
      country: row.country ?? "",
      logo_url: row.logo_url ?? "",
      avatar_url: row.avatar_url ?? "",
      hero_image_url: row.hero_image_url ?? "",
      public_slug: row.public_slug ?? "",
      available_from: row.available_from ?? null,
      available_until: row.available_until ?? null,
      available_note: row.available_note ?? "",
      is_available_now: false, // recalculado por request (depende de today)
      is_verified: !!row.verified_at,
      is_drop_pick: !!row.is_drop_pick,
      drop_pick_priority: row.drop_pick_priority ?? 0,
      show_fee: !!row.show_fee,
      fee_min: row.fee_min ?? null,
      fee_max: row.fee_max ?? null,
      featured_sets: row.featured_sets ?? [],
      completeness: computeCompleteness(row).percent,
    }));
  },
  ["public-djs-base"],
  { revalidate: 300, tags: ["public-djs"] }
);

/**
 * Lista los DJs públicos aplicando filtros EN MEMORIA sobre la lectura base
 * cacheada. Ordenado por disponibilidad por default.
 */
export async function listPublicDjs(
  params: ListDirectoryParams = {}
): Promise<PublicDjProfile[]> {
  const base = await getPublicDjsBase();

  // Recalcular disponibilidad fresca (depende de today, no se cachea).
  let result = base.map((d) => ({
    ...d,
    is_available_now: calcIsAvailable(d.available_from, d.available_until),
  }));

  // Filtros en memoria. Dataset chico y la lectura ya viene cacheada.
  // Géneros case-insensitive: los chips de listPublicGenres vienen en minúscula
  // y los géneros guardados pueden tener mayúsculas/espacios.
  if (params.city) {
    const c = params.city.toLowerCase();
    result = result.filter((d) => d.city.toLowerCase().includes(c));
  }
  if (params.country) {
    const c = params.country.toLowerCase();
    result = result.filter((d) => d.country.toLowerCase().includes(c));
  }
  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim().toLowerCase();
    result = result.filter(
      (d) =>
        d.artist_name.toLowerCase().includes(s) ||
        d.city.toLowerCase().includes(s) ||
        d.tagline.toLowerCase().includes(s)
    );
  }
  if (params.genres && params.genres.length > 0) {
    const wanted = params.genres.map((g) => g.trim().toLowerCase());
    result = result.filter((d) =>
      d.genres.some((g) => wanted.includes(g.trim().toLowerCase()))
    );
  }
  if (params.onlyAvailable) {
    result = result.filter((d) => d.is_available_now);
  }
  if (typeof params.budget === "number" && params.budget > 0) {
    const b = params.budget;
    // Excluye solo a los que claramente se pasan: publican tarifa y su mínimo
    // supera el presupuesto. Los que no publican tarifa (o calzan) se quedan.
    result = result.filter(
      (d) => !(d.show_fee && d.fee_min != null && d.fee_min > b)
    );
  }

  // Sort: disponibles primero, después alfabético.
  if (params.sort === "name") {
    result.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
  } else {
    result.sort((a, b) => {
      if (a.is_available_now && !b.is_available_now) return -1;
      if (!a.is_available_now && b.is_available_now) return 1;
      return a.artist_name.localeCompare(b.artist_name);
    });
  }

  return result.slice(0, params.limit ?? 200);
}

/**
 * DROP Picks (RA-2A): DJs destacados por admin, ordenados por prioridad
 * (mayor primero). Para la fila "DROP PICKS" arriba de /dj. Deriva de la
 * misma lectura base cacheada.
 */
export async function getDropPicks(limit = 8): Promise<PublicDjProfile[]> {
  const base = await getPublicDjsBase();
  return base
    .filter((d) => d.is_drop_pick)
    .map((d) => ({
      ...d,
      is_available_now: calcIsAvailable(d.available_from, d.available_until),
    }))
    .sort((a, b) => {
      if (b.drop_pick_priority !== a.drop_pick_priority) {
        return b.drop_pick_priority - a.drop_pick_priority;
      }
      return a.artist_name.localeCompare(b.artist_name);
    })
    .slice(0, limit);
}

/**
 * Géneros únicos usados por los DJs públicos (para los chips del filtro).
 * Derivado de la MISMA lectura base cacheada (sin query extra a la DB).
 */
export async function listPublicGenres(): Promise<
  { genre: string; count: number }[]
> {
  const base = await getPublicDjsBase();
  const counts = new Map<string, number>();
  for (const d of base) {
    for (const g of d.genres) {
      const k = g.trim().toLowerCase();
      if (k.length === 0) continue;
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Ciudades únicas con conteo (para el filtro). Derivado de la misma lectura
 * base cacheada (sin query extra a la DB).
 */
export async function listPublicCities(): Promise<
  { city: string; count: number }[]
> {
  const base = await getPublicDjsBase();
  const counts = new Map<string, number>();
  for (const d of base) {
    const c = (d.city ?? "").trim();
    if (c.length === 0) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
}
