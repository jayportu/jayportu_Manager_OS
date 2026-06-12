/**
 * Sprint 20 — robots.txt
 *
 * Permite indexar rutas públicas (/dj, /p/[slug]).
 * Bloquea /api, /(app), /login, /welcome, /admin.
 */
import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dj", "/p/"],
        disallow: [
          // Filtros del directorio (?q ?city ?genres ?avail): cada chip de género
          // y cada card generan links con combinaciones → espacio de crawl casi
          // infinito ("trampa de crawler"). Sin esto los bots golpeaban /dj ~1M
          // veces/12h (análisis uso Vercel jun 2026). /dj limpio sigue indexable.
          "/dj?",
          "/api/",
          "/dashboard",
          "/crm",
          "/calendario",
          "/growth",
          "/campanas",
          "/press-kit",
          "/descubrir",
          "/configuracion",
          "/admin",
          "/welcome",
          "/login",
          "/gmail",
          "/ia",
          "/mas",
          "/plantillas",
          "/logout",
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
