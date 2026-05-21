import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Cerrar sesión vía GET/POST a /logout.
 * - Borra la sesión Supabase
 * - Redirige a /login
 *
 * Útil para tener un endpoint explícito que se puede invocar desde cualquier lado:
 * <a href="/logout">Cerrar sesión</a>
 */
async function signOutAndRedirect(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function GET(request: Request) {
  return signOutAndRedirect(request);
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}
