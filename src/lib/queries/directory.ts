/**
 * Sprint 20 — Directorio público de DJs (`/dj`).
 *
 * Estas queries usan service_role (admin client) porque `/dj` no requiere
 * auth. RLS no aplica para queries server-side. Filtramos manualmente
 * `hidden_from_directory = false` y `onboarding_completed_at IS NOT NULL`
 * para no exponer perfiles incompletos.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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
  hero_image_url: string;
  public_slug: string;
  available_from: string | null;
  available_until: string | null;
  available_note: string;
  /** Calculado server-side a partir de las fechas y today */
  is_available_now: boolean;
}

export interface ListDirectoryParams {
  search?: string;
  city?: string;
  country?: string;
  /** Géneros que el DJ tiene (al menos uno coincide → match). */
  genres?: string[];
  /** Si true, solo DJs disponibles HOY. */
  onlyAvailable?: boolean;
  /** Sort: 'available' (disponibles primero) o 'name' (alfabético). */
  sort?: "available" | "name";
  limit?: number;
}

function calcIsAvailable(
  from: string | null,
  until: string | null
): boolean {
  if (!from) return false;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  if (today < from) return false;
  if (until && today > until) return false;
  return true;
}

/**
 * Lista todos los DJs públicos del directorio.
 * Filtros server-side. Ordenado por disponibilidad por default.
 */
export async function listPublicDjs(
  params: ListDirectoryParams = {}
): Promise<PublicDjProfile[]> {
  const admin = createAdminClient();
  let q = admin
    .from("dj_profile")
    .select(
      "user_id, artist_name, tagline, bio_short, genres, city, country, logo_url, hero_image_url, public_slug, available_from, available_until, available_note, onboarding_completed_at, hidden_from_directory"
    )
    .eq("hidden_from_directory", false)
    .not("onboarding_completed_at", "is", null)
    .not("public_slug", "is", null)
    .not("artist_name", "is", null);

  // Filtros
  if (params.city) q = q.ilike("city", `%${params.city}%`);
  if (params.country) q = q.ilike("country", `%${params.country}%`);
  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim();
    q = q.or(`artist_name.ilike.%${s}%,city.ilike.%${s}%,tagline.ilike.%${s}%`);
  }
  if (params.genres && params.genres.length > 0) {
    // overlaps: al menos uno coincide
    q = q.overlaps("genres", params.genres);
  }

  const { data, error } = await q.limit(params.limit ?? 200);
  if (error) {
    console.error("listPublicDjs error:", error);
    return [];
  }

  // Map + calcular disponibilidad
  const result: PublicDjProfile[] = (data ?? []).map(
    (row: Partial<DjProfile>) => ({
      user_id: row.user_id as string,
      artist_name: row.artist_name ?? "",
      tagline: row.tagline ?? "",
      bio_short: row.bio_short ?? "",
      genres: row.genres ?? [],
      city: row.city ?? "",
      country: row.country ?? "",
      logo_url: row.logo_url ?? "",
      hero_image_url: row.hero_image_url ?? "",
      public_slug: row.public_slug ?? "",
      available_from: row.available_from ?? null,
      available_until: row.available_until ?? null,
      available_note: row.available_note ?? "",
      is_available_now: calcIsAvailable(
        row.available_from ?? null,
        row.available_until ?? null
      ),
    })
  );

  // Filtro "solo disponibles" (después del map porque depende de fechas vs today).
  const filtered = params.onlyAvailable
    ? result.filter((d) => d.is_available_now)
    : result;

  // Sort: disponibles primero, después alfabético.
  if (params.sort === "name") {
    filtered.sort((a, b) => a.artist_name.localeCompare(b.artist_name));
  } else {
    filtered.sort((a, b) => {
      if (a.is_available_now && !b.is_available_now) return -1;
      if (!a.is_available_now && b.is_available_now) return 1;
      return a.artist_name.localeCompare(b.artist_name);
    });
  }

  return filtered;
}

/**
 * Lista los géneros únicos usados por todos los DJs públicos. Para
 * autocompletar el filtro en /dj.
 */
export async function listPublicGenres(): Promise<
  { genre: string; count: number }[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dj_profile")
    .select("genres")
    .eq("hidden_from_directory", false)
    .not("onboarding_completed_at", "is", null);
  if (error) return [];
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { genres: string[] | null }[]) {
    for (const g of row.genres ?? []) {
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
 * Lista las ciudades únicas con conteo. Para autocompletar filtro.
 */
export async function listPublicCities(): Promise<
  { city: string; count: number }[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dj_profile")
    .select("city")
    .eq("hidden_from_directory", false)
    .not("onboarding_completed_at", "is", null);
  if (error) return [];
  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { city: string | null }[]) {
    const c = (row.city ?? "").trim();
    if (c.length === 0) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count);
}
