import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Callback de Supabase Auth (email confirmación + magic links + Google OAuth).
 * Intercambia el code por una sesión y redirige a /dashboard.
 *
 * IMPORTANTE: cualquier error acá tiene que loguearse (no hay Vercel
 * runtime logs accesibles via API después) y propagarse al UI de /login
 * con un mensaje human-readable. Antes tragaba errores en silencio
 * → users como Santis hacían signup, el code expiraba, y veían /login
 * limpio sin entender qué pasó.
 *
 * Login con Google: el botón pide SOLO email/perfil (no sensibles), así
 * que acá NO tocamos gmail_connections. La conexión Gmail/Calendar
 * (permisos sensibles/restringidos) se hace aparte vía /api/gmail/auth
 * → /api/gmail/callback. Si el email no está aprobado en beta_requests,
 * el trigger DB rechaza el insert y redirigimos con mensaje claro.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default "/" → RootPage rutea por tipo (DJ→/dashboard, booker→/booker/requests).
  // El signup booker pasa next=/booker/requests explícito; lo respetamos.
  // Anti open-redirect: solo rutas internas. Sin esto, next=@evil.com producía
  // `${origin}@evil.com` → el navegador resuelve host=evil.com (redirect externo).
  const rawNext = searchParams.get("next") ?? "/";
  const next =
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "/";
  // Reset de contraseña: resetPasswordForEmail manda el link de recovery
  // con next=/auth/reset-password. Detectarlo nos deja dar mensajes de
  // error específicos del reset (link expirado → pedir uno nuevo) en vez
  // del copy de confirmación de cuenta que muestra /login.
  const isRecovery = next.startsWith("/auth/reset-password");
  // Supabase puede mandar error directo en la URL (ej. link expirado)
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    console.error("[auth/callback] error en URL params", {
      error: errorParam,
      description: errorDescription,
    });
    if (isRecovery) {
      return NextResponse.redirect(
        `${origin}/auth/forgot-password?error=expired`
      );
    }
    // Si el error viene del flow OAuth Google y trae signature del
    // trigger beta_signup, redirigimos a /login con copy específico.
    if (errorDescription && /beta/i.test(errorDescription)) {
      return NextResponse.redirect(
        `${origin}/login?auth_error=beta_required`
      );
    }
    return NextResponse.redirect(
      `${origin}/login?auth_error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    console.error("[auth/callback] sin code en URL");
    if (isRecovery) {
      return NextResponse.redirect(
        `${origin}/auth/forgot-password?error=expired`
      );
    }
    return NextResponse.redirect(`${origin}/login?auth_error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession falló", {
      code_prefix: code.slice(0, 8),
      error_message: error.message,
      error_status: error.status,
      error_code: error.code,
    });
    if (isRecovery) {
      return NextResponse.redirect(
        `${origin}/auth/forgot-password?error=expired`
      );
    }
    // Trigger DB enforce_beta_signup_trigger lanza este mensaje cuando
    // un DJ se intenta loguear con Google pero su email no está
    // aprobado en beta_requests. Lo capturamos acá para redirigir bien.
    if (/beta|signup bloqueado/i.test(error.message)) {
      return NextResponse.redirect(
        `${origin}/login?auth_error=beta_required`
      );
    }
    // Mapear códigos comunes a flags que el /login UI traduce
    const flag =
      error.code === "otp_expired" || error.message.toLowerCase().includes("expired")
        ? "expired"
        : error.code === "invalid_grant"
          ? "invalid_grant"
          : "callback_failed";
    return NextResponse.redirect(`${origin}/login?auth_error=${flag}`);
  }

  console.log("[auth/callback] OK", {
    user_id: data.user?.id?.slice(0, 8),
    email: data.user?.email,
    via_google: !!data.session?.provider_token,
  });
  return NextResponse.redirect(`${origin}${next}`);
}
