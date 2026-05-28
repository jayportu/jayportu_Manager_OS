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
