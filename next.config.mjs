/** @type {import('next').NextConfig} */
const nextConfig = {
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
    ];
  },
};

export default nextConfig;
