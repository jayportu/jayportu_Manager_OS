/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};

export default nextConfig;
