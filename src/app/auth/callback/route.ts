import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Callback de Supabase Auth (email confirmación + magic links).
 * Intercambia el code por una sesión y redirige a /dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Si algo falla, vuelve a /login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
