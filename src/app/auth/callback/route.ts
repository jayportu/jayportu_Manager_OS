import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GOOGLE_SCOPES } from "@/lib/gmail/scopes";

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
 * Sprint 24 — Login con Google: cuando el provider es Google y la
 * sesión trae provider_token + provider_refresh_token, los persistimos
 * en gmail_connections. Así el DJ que entra con Google queda con
 * Gmail/Calendar conectados sin pasos extra. Si el email no está
 * aprobado en beta_requests, el trigger DB rechaza el insert y
 * mostramos un mensaje claro redirigiendo a /beta.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Default "/" → RootPage rutea por tipo (DJ→/dashboard, booker→/booker/requests).
  // El signup booker pasa next=/booker/requests explícito; lo respetamos.
  const next = searchParams.get("next") ?? "/";
  // Supabase puede mandar error directo en la URL (ej. link expirado)
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    console.error("[auth/callback] error en URL params", {
      error: errorParam,
      description: errorDescription,
    });
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

  // Sprint 24 — Si vino de Google OAuth (signInWithOAuth con provider=google),
  // Supabase guarda los tokens de Google en session.provider_token y
  // session.provider_refresh_token. Los usamos para llenar/refrescar
  // gmail_connections así el user queda con Gmail+Calendar de regalo
  // sin tener que pasar después por Configuración → Conectar.
  const providerToken = data.session?.provider_token;
  const providerRefreshToken = data.session?.provider_refresh_token;
  const userEmail = data.user?.email;
  if (providerToken && userEmail) {
    try {
      // Google access_tokens duran 1h por defecto. Sin un campo
      // expires_in expuesto por Supabase para el provider_token,
      // asumimos 50min (margen seguro vs 60min real).
      const expiresAt = new Date(Date.now() + 50 * 60 * 1000).toISOString();

      // Upsert: si el user ya tenía conexión Gmail manual, la pisamos
      // con la nueva (refresh_token nuevo + scope actualizado).
      // Si NO viene refresh_token (Google solo lo da con prompt=consent
      // o primer authorize), preservamos el existente leyendo primero.
      let refreshToken = providerRefreshToken || "";
      if (!refreshToken) {
        const { data: existing } = await supabase
          .from("gmail_connections")
          .select("refresh_token")
          .eq("user_id", data.user.id)
          .single();
        if (existing?.refresh_token) refreshToken = existing.refresh_token;
      }

      const { error: connErr } = await supabase
        .from("gmail_connections")
        .upsert(
          {
            user_id: data.user.id,
            google_email: userEmail,
            access_token: providerToken,
            refresh_token: refreshToken,
            // Asumimos que Google otorgó todos los scopes pedidos —
            // si concedió menos, el GoogleScopeBanner lo detecta
            // proactivamente en la próxima carga.
            scope: GOOGLE_SCOPES.join(" "),
            token_type: "Bearer",
            expires_at: expiresAt,
          },
          { onConflict: "user_id" }
        );
      if (connErr) {
        // No bloqueamos el login si falla esto: el user igual entra,
        // y puede conectar Gmail manualmente después si quiere.
        console.error("[auth/callback] upsert gmail_connections falló", {
          user_id: data.user.id.slice(0, 8),
          error: connErr.message,
        });
      } else {
        console.log("[auth/callback] gmail_connections sincronizado", {
          user_id: data.user.id.slice(0, 8),
          google_email: userEmail,
        });
      }
    } catch (e) {
      console.error("[auth/callback] error guardando gmail_connections", e);
    }
  }

  console.log("[auth/callback] OK", {
    user_id: data.user?.id?.slice(0, 8),
    email: data.user?.email,
    via_google: !!providerToken,
  });
  return NextResponse.redirect(`${origin}${next}`);
}
