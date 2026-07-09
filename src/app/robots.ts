/**
 * Sprint 20 — robots.txt
 *
 * Permite indexar rutas públicas (/dj, /p/[slug]).
 * Bloquea /api, /(app), /login, /welcome, /admin.
 */
import type { MetadataRoute } from "next";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

// Crawlers agresivos (SEO scrapers + bots de entrenamiento de IA) que martillan
// el sitio sin aportar tráfico real a una beta privada de bookings → bloqueo
// total. Plan B de control de costos (análisis uso Vercel, jun 2026).
// NO se incluyen buscadores reales (Googlebot, Bingbot, Applebot, YandexBot,
// DuckDuckBot…) ni bots de previsualización de links (WhatsApp, Twitterbot,
// facebookexternalhit, LinkedInBot, Slackbot, Discordbot) — esos sí deben pasar.
const BLOCKED_BOTS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "DataForSeoBot",
  "BLEXBot",
  "PetalBot",
  "Bytespider",
  "GPTBot",
  "CCBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "Amazonbot",
  "PerplexityBot",
  "Applebot-Extended",
  "Diffbot",
  "ImagesiftBot",
  "Omgili",
  "cohere-ai",
  "SerpstatBot",
  "MegaIndex",
];

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
          "/mas",
          "/plantillas",
          "/logout",
        ],
      },
      // Plan B: a los crawlers agresivos/IA se les bloquea todo el sitio.
      {
        userAgent: BLOCKED_BOTS,
        disallow: "/",
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
