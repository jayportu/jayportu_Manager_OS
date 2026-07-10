/**
 * Middleware Supabase: refresca la sesión en cada request y protege rutas privadas.
 * Si no hay sesión y la ruta no es pública → redirige a /login.
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/logout", // el handler limpia sesión y manda al landing (/) — sin esto el
             // middleware rebotaba un /logout sin sesión a /login
  "/signup", // /signup/booker es público (Bloque B)
  "/auth",
  "/_next",
  "/favicon.ico",
  "/p/", // press kit públicos
  "/l/", // Fase 4 — link-in-bio público (Linktree) para fans anónimos, sin login
  "/dj", // Sprint 20 — directorio público de DJs
  "/e/", // RA-7 — página pública de evento + RSVP de fans (sin cuenta)
  "/eventos", // feed público de eventos para fans
  "/b/", // Bloque B — vista tokenizada del booker sin login
  "/beta", // Sprint 23.5 — formulario solicitud beta
  "/api/beta", // Sprint 23.5 — submit del formulario beta
  "/terms", // Security #7 — términos públicos (footer landing/login, Google OAuth, SERNAC)
  "/privacy", // Security #7 — política privacidad pública (footer landing/login, Google OAuth, Ley 19.628)
  "/sitemap.xml", // Sprint 20 — sitemap dinámico
  "/robots.txt", // Sprint 20 — robots
  // OJO: "/api/track" NO va acá como prefijo — colisiona con "/api/tracklist/*"
  // (startsWith lo marcaría público y saltearía getUser). Se matchea EXACTO en
  // isPublic más abajo. Los routes /api/tracklist/* validan sesión adentro, así
  // que hoy no es explotable, pero un route nuevo /api/track* heredaría el hueco.
  "/api/site-track", // tráfico del sitio (pageviews anónimos → /admin/trafico)
  "/api/event-rsvp", // RA-7 — submit del RSVP de fans (sin cuenta)
  "/api/booking", // formulario público
  "/api/gmail/sync-cron", // cron endpoint (protegido con CRON_SECRET en header)
  "/api/growth/sync-cron", // cron endpoint (protegido con CRON_SECRET en header)
  "/api/push/send-cron", // cron endpoint (protegido con CRON_SECRET en header)
  "/api/beta/expire-cron", // Sprint 23.5 cron (protegido con CRON_SECRET)
  "/api/follow-updates/cron", // Sprint RA-3 cron (protegido con CRON_SECRET)
  "/api/onboarding-nudge/cron", // nudge perfil incompleto (protegido con CRON_SECRET)
  "/api/pulso/cron", // digest semanal del pulso de beta (protegido con CRON_SECRET)
  "/api/admin/dj-verify", // verificación automática de DJs (protegido con DJ_VERIFY_SECRET en header)
  "/api/unsubscribe", // List-Unsubscribe header target (Gmail bulk sender req)
  "/api/resend/webhook", // Webhook de Resend (verifica firma Svix adentro)
  "/api/mp/webhook", // Webhook de MercadoPago (verifica firma HMAC adentro) — sin esto MP redirige a /login y los pagos nunca se procesan
  "/sw.js", // service worker debe ser servido sin auth gate
  "/manifest.json", // manifest PWA público
  // /api/gmail/callback NO es público — el callback verifica sesión adentro.
  // Pero /api/gmail/auth y /disconnect requieren sesión, las dejamos detrás del middleware.
];

// UUID v4 básico — los invite_tokens son gen_random_uuid()
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITE_COOKIE = "dropbeta_invite_token";
const FOUNDING_COOKIE = "dropfounding_invite_token"; // Fase 2 · Founding Bookers
// 7 días: cubre el caso "user abre invite, hace signup, tarda en confirmar
// el email (5-15min normal), o lo abre en otro dispositivo después del trabajo".
// Antes eran 30 min y se perdía la activación silenciosamente.
const INVITE_TTL = 60 * 60 * 24 * 7;

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // UI Lab (/ui-experiments): exploración aislada con datos ficticios. Público
  // SOLO cuando se sirve desde localhost/127.0.0.1 (desarrollo) para poder abrir
  // los mockups en el navegador local. En el dominio de producción (dropgigs.com)
  // o en previews *.vercel.app el host NO es localhost → sigue privado (redirige
  // a /login), sin cambiar en nada el comportamiento productivo. Basado en host
  // (no en NODE_ENV) para ser robusto en el Edge runtime del middleware.
  const host = request.headers.get("host") ?? "";
  const isLocalDev = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const isPublic =
    pathname === "/api/track" || // pixel de press kit (match EXACTO, ver nota arriba)
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    (isLocalDev && pathname.startsWith("/ui-experiments"));

  // /login y /signup* necesitan contexto de sesión: redirigen a un usuario ya
  // logueado fuera de esas pantallas y setean cookies de invite/founding abajo.
  const needsAuthContext =
    pathname === "/login" || pathname.startsWith("/signup");

  // El resto de rutas públicas (páginas crawleables /dj /eventos /e/ /b/, pixeles
  // /api/track y /api/site-track, webhooks, sitemap/robots, sw/manifest…) NO
  // necesita validar sesión. Nos saltamos getUser() para no gastar una llamada a
  // Supabase + un evento de Observability en CADA hit de bot/crawler/pixel — que
  // es la enorme mayoría del tráfico (análisis de uso Vercel, jun 2026).
  if (isPublic && !needsAuthContext) {
    return NextResponse.next({ request });
  }

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

  // Sprint 23.5 — Invite flow:
  // /login?invite=<UUID> → guardamos el token en cookie HttpOnly. El cookie
  // no se puede setear desde un server component (Next.js lanza error), por
  // eso lo hacemos acá. La consume luego (app)/layout vía consumeBetaInviteIfAny.
  if (pathname === "/login") {
    const inviteParam = request.nextUrl.searchParams.get("invite");
    if (inviteParam && UUID_RE.test(inviteParam)) {
      supabaseResponse.cookies.set(INVITE_COOKIE, inviteParam, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: INVITE_TTL,
        path: "/",
      });
    }
  }

  // Fase 2 — Founding Bookers: /signup/booker?founding=<UUID> guarda el token
  // en cookie HttpOnly. Lo consume /booker/layout vía consumeFoundingInviteIfAny.
  if (pathname === "/signup/booker") {
    const foundingParam = request.nextUrl.searchParams.get("founding");
    if (foundingParam && UUID_RE.test(foundingParam)) {
      supabaseResponse.cookies.set(FOUNDING_COOKIE, foundingParam, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: INVITE_TTL,
        path: "/",
      });
    }
  }

  // Bloque B — La raíz "/" ahora es la landing pública split-screen
  // (DJ vs Booker). El RootPage decide qué hacer según el tipo de usuario:
  //   - DJ logueado → /dashboard
  //   - Booker logueado → /booker/requests
  //   - Sin sesión → renderiza landing split
  // No redirect desde middleware: dejamos que la page.tsx decida.

  // Si no hay user y la ruta es privada → redirige a /login
  if (!user && !isPublic && pathname !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Si hay user y está en /login o cualquier /signup* → redirige a "/" y
  // RootPage decide el destino (DJ→/dashboard, booker→/booker/requests). Antes
  // "/signup" era exacto y dejaba pasar a un logueado a /signup/booker. (El
  // cookie de founding ya se guardó arriba, así que ese flujo no se pierde.)
  if (user && (pathname === "/login" || pathname.startsWith("/signup"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
