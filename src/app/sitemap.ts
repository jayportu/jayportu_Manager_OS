/**
 * Sprint 20 — Sitemap dinámico.
 *
 * Genera /sitemap.xml con:
 *  - URLs estáticas públicas
 *  - URL por cada DJ público (/p/[slug])
 */
import type { MetadataRoute } from "next";
import {
  listPublicDjs,
  listPublicGenres,
  listPublicCities,
} from "@/lib/queries/directory";
import { slugify } from "@/lib/slug";

// Dominio canónico. Usa NEXT_PUBLIC_SITE_URL en producción y fallback al
// dominio público dropgigs.com. Si cambia el dominio, basta con setear
// la env var — no requiere recompilar nada más.
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

/**
 * Sitemap dinámico: se regenera con cada request (cache 1h).
 * No se genera en build-time porque depende de Supabase con service_role.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Si la DB no está accesible (build-time), devolver solo las páginas estáticas
  // para que el build no falle.
  let djs: Awaited<ReturnType<typeof listPublicDjs>> = [];
  let genres: Awaited<ReturnType<typeof listPublicGenres>> = [];
  let cities: Awaited<ReturnType<typeof listPublicCities>> = [];
  try {
    [djs, genres, cities] = await Promise.all([
      listPublicDjs({ limit: 500 }),
      listPublicGenres(),
      listPublicCities(),
    ]);
  } catch {
    djs = [];
    genres = [];
    cities = [];
  }
  return buildSitemap(djs, genres, cities);
}

function buildSitemap(
  djs: Awaited<ReturnType<typeof listPublicDjs>>,
  genres: Awaited<ReturnType<typeof listPublicGenres>> = [],
  cities: Awaited<ReturnType<typeof listPublicCities>> = []
): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE}/dj`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE}/eventos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const djPages: MetadataRoute.Sitemap = djs.map((d) => ({
    url: `${SITE}/p/${d.public_slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: d.is_available_now ? 0.8 : 0.6,
  }));

  // SEO #4 — facetas indexables de género/ciudad (long-tail).
  const genrePages: MetadataRoute.Sitemap = genres.map((g) => ({
    url: `${SITE}/dj/genero/${slugify(g.genre)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));
  const cityPages: MetadataRoute.Sitemap = cities.map((c) => ({
    url: `${SITE}/dj/ciudad/${slugify(c.city)}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...djPages, ...genrePages, ...cityPages];
}
