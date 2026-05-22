/**
 * Middleware Supabase: refresca la sesión en cada request y protege rutas privadas.
 * Si no hay sesión y la ruta no es pública → redirige a /login.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/_next",
  "/favicon.ico",
  "/p/", // press kit públicos
  "/api/track", // tracking endpoint
  "/api/booking", // formulario público
  "/api/gmail/sync-cron", // cron endpoint (protegido con CRON_SECRET en header)
  "/api/growth/sync-cron", // cron endpoint (protegido con CRON_SECRET en header)
  // /api/gmail/callback NO es público — el callback verifica sesión adentro.
  // Pero /api/gmail/auth y /disconnect requieren sesión, las dejamos detrás del middleware.
];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // CRÍTICO: getUser() refresca la sesión. NO usar getSession() acá.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Si no hay user y la ruta es privada → redirige a /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si hay user y está en /login → redirige a /dashboard
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
