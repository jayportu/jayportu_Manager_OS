/**
 * Sprint 20 — robots.txt
 *
 * Permite indexar rutas públicas (/dj, /p/[slug]).
 * Bloquea /api, /(app), /login, /welcome, /admin.
 */
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dj", "/p/"],
        disallow: [
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
    sitemap: "https://drop.dj/sitemap.xml",
  };
}
