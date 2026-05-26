import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Callback de Supabase Auth (email confirmación + magic links).
 * Intercambia el code por una sesión y redirige a /dashboard.
 *
 * IMPORTANTE: cualquier error acá tiene que loguearse (no hay Vercel
 * runtime logs accesibles via API después) y propagarse al UI de /login
 * con un mensaje human-readable. Antes tragaba errores en silencio
 * → users como Santis hacían signup, el code expiraba, y veían /login
 * limpio sin entender qué pasó.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  // Supabase puede mandar error directo en la URL (ej. link expirado)
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    console.error("[auth/callback] error en URL params", {
      error: errorParam,
      description: errorDescription,
    });
    return NextResponse.redirect(
      `${origin}/login?auth_error=${encodeURIComponent(errorParam)}`
    );
  }

  if (!code) {
    console.error("[auth/callback] sin code en URL");
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
  });
  return NextResponse.redirect(`${origin}${next}`);
}
