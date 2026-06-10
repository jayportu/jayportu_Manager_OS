import { fileURLToPath } from "url";
import { dirname } from "path";

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
    // Egress: Vercel cachea cada variante optimizada al menos este tiempo
    // antes de re-bajar el original desde Supabase Storage. Default era 60s →
    // re-fetch frecuente. 31 días corta drásticamente el egress de Storage
    // (las fotos usan path con timestamp único, así que cache largo es seguro).
    minimumCacheTTL: 2678400,
  },
  // Security headers (Fase 6 hardening). Defensa en profundidad — Cloudflare
  // ya está delante, esto es otro layer en el origin.
  async headers() {
    // CSP en REPORT-ONLY: no bloquea nada, solo reporta violaciones en la
    // consola del browser. Sienta la base para endurecer/enforzar después
    // sin riesgo de romper embeds (SoundCloud/YouTube/Mixcloud/Spotify),
    // el SDK de MercadoPago, imágenes de Supabase, ni los inline scripts de Next.
    const cspReportOnly = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://*.mercadopago.com https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://*.mercadopago.com https://countriesnow.space",
      "frame-src 'self' https://w.soundcloud.com https://*.soundcloud.com https://www.youtube.com https://www.youtube-nocookie.com https://www.mixcloud.com https://open.spotify.com https://*.mercadopago.com https://challenges.cloudflare.com",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
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
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
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

export default nextConfig;
