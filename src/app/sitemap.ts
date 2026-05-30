/**
 * Sprint 20 — Sitemap dinámico.
 *
 * Genera /sitemap.xml con:
 *  - URLs estáticas públicas
 *  - URL por cada DJ público (/p/[slug])
 */
import type { MetadataRoute } from "next";
import { listPublicDjs } from "@/lib/queries/directory";

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
  try {
    djs = await listPublicDjs({ limit: 500 });
  } catch {
    djs = [];
  }
  return buildSitemap(djs);
}

function buildSitemap(
  djs: Awaited<ReturnType<typeof listPublicDjs>>
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

  return [...staticPages, ...djPages];
}
