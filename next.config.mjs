import { fileURLToPath } from "url";
import { dirname } from "path";
import { withSentryConfig } from "@sentry/nextjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hay un package-lock.json perdido en ~/ que Next 15 tomaba como raíz del
  // workspace. Fijamos la raíz a este proyecto para el file tracing en Vercel.
  outputFileTracingRoot: __dirname,
  // Server Actions default body limit es 1 MB → rompía subidas de avatar
  // (foto de perfil) con error críptico para fotos del celular (2-4 MB).
  // Subimos a 25 MB que cubre el caso más grande (press-kit PDF, 25 MB).
  // La política real por feature la hace cada action:
  //   - avatar:     10 MB (validado en src/app/(app)/perfil/avatar-actions.ts)
  //   - press-kit:  25 MB (validado en src/app/(app)/configuracion/press-kit-actions.ts)
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  // Habilita <Image> con fuentes externas. Sin esto, Next bloquea remote
  // URLs por seguridad. Los avatares de los DJs se sirven desde Supabase
  // Storage; habilitamos ese path específicamente. Next genera variantes
  // WebP/AVIF y responsive srcset automáticamente para cada <Image>, lo
  // que elimina el problema de "fotos de 4 MB downscaleadas en bruto a
  // 280px y se ven feas".
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Calidades usadas por next/image en la app (cards/hero 85, avatar 90).
    // Declararlas evita el warning de deprecación y será obligatorio en Next 16.
    qualities: [85, 90],
    // Egress: Vercel cachea cada variante optimizada al menos este tiempo
    // antes de re-bajar el original desde Supabase Storage. Default era 60s →
    // re-fetch frecuente. 31 días corta drásticamente el egress de Storage
    // (las fotos usan path con timestamp único, así que cache largo es seguro).
    minimumCacheTTL: 2678400,
  },
  // Security headers (Fase 6 hardening). Defensa en profundidad — Cloudflare
  // ya está delante, esto es otro layer en el origin.
  async headers() {
    // CSP ENFORCED (bloquea, no solo reporta). El allowlist cubre todo lo que
    // el sitio usa de verdad: Supabase (REST + realtime wss + Storage), SDK de
    // MercadoPago, embeds (SoundCloud/YouTube/Mixcloud/Spotify), Cloudflare
    // Turnstile, Sentry (ingest), countriesnow (ciudades), imágenes https y los
    // scripts inline/eval que Next necesita.
    //
    // NOTA: se mantienen 'unsafe-inline' y 'unsafe-eval' (Next los necesita sin
    // nonces). El endurecimiento full (nonces → quitar unsafe-inline) es un pase
    // dedicado futuro; aun así esto YA bloquea cargar scripts de dominios no
    // autorizados (el vector típico de XSS / supply-chain) + object/base/form.
    const csp = [
      "default-src 'self'",
      // va.vercel-scripts.com solo en dev (script debug de Vercel Analytics;
      // en prod carga first-party desde /_vercel).
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.mercadopago.com https://challenges.cloudflare.com${process.env.NODE_ENV === "development" ? " https://va.vercel-scripts.com" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // soundcloud.com: oEmbed check del press kit (detecta cuentas muertas
      // para no renderizar un player vacío).
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.mercadopago.com https://countriesnow.space https://*.sentry.io https://soundcloud.com",
      "frame-src 'self' https://w.soundcloud.com https://*.soundcloud.com https://www.youtube.com https://www.youtube-nocookie.com https://www.mixcloud.com https://open.spotify.com https://*.mercadopago.com https://challenges.cloudflare.com",
      "media-src 'self' https: blob:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
  // Redirects para mantener URLs viejas funcionando después de renames.
  async redirects() {
    return [
      // Renombre 2026-05-28: /growth/campanas → /growth/ads (deuda técnica
      // #01: dos rutas se llamaban "campañas", quedó solo `/campanas` para
      // outbound y `/growth/ads` para growth/promoción).
      {
        source: "/growth/campanas",
        destination: "/growth/ads",
        permanent: true,
      },
      {
        source: "/growth/campanas/:path*",
        destination: "/growth/ads/:path*",
        permanent: true,
      },
      // 2026-05-28: /mas era el hub mobile cuando teníamos BottomNav.
      // Con el menú desplegable nuevo ya no hace falta — todo se accede
      // desde el sidebar/drawer.
      {
        source: "/mas",
        destination: "/dashboard",
        permanent: true,
      },
      // 2026-05-28: /booker/favoritos → /booker/seguidos (Sprint RA-3).
      // El feed de seguidos reemplaza el listado simple de favoritos.
      {
        source: "/booker/favoritos",
        destination: "/booker/seguidos",
        permanent: true,
      },
      // 2026-06-07: IA sacada del app (no era prioridad). El código queda en
      // src/app/(app)/ia para una integración futura; la ruta redirige.
      // permanent:false a propósito (reversible sin 301 cacheado en el browser).
      {
        source: "/ia",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

// ─── Sentry: source maps en build → trazas de PROD legibles ───────────────
// Sin source maps, un error en prod sale minificado (`sN`/`iz`, `<script>:1:…`)
// y es imposible de diagnosticar. withSentryConfig los sube en `next build`.
//
// DORMIDO sin SENTRY_AUTH_TOKEN: se exporta la config tal cual → build idéntico
// y cero overhead (mismo criterio que el resto de la integración Sentry). Se
// activa poniendo SENTRY_AUTH_TOKEN + SENTRY_ORG en Vercel (ver .env.example).
const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default sentryUploadEnabled
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT || "dropgigs",
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // Silencioso salvo en CI (donde el log de subida sí es útil).
      silent: !process.env.CI,
      // Sube también los chunks del cliente que Next sirve fuera de las páginas
      // → mejor cobertura de stack traces.
      widenClientFileUpload: true,
      // Tree-shake el logger interno de Sentry del bundle cliente.
      disableLogger: true,
      // No dejar los .map servidos públicamente (no exponer el código fuente);
      // se suben a Sentry y se borran del output tras la subida.
      sourcemaps: { deleteSourcemapsAfterUpload: true },
    })
  : nextConfig;
