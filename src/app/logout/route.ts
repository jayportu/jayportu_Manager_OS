import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Cerrar sesión vía GET/POST a /logout.
 * - Borra la sesión Supabase
 * - Redirige al LANDING público (/) — no a /login. El landing es la cara
 *   pública (con su botón "Entrar" para volver a loguearse); aterrizar en
 *   /login tras cerrar sesión se sentía como un callejón.
 *
 * Útil para tener un endpoint explícito que se puede invocar desde cualquier lado:
 * <a href="/logout">Cerrar sesión</a>
 */
async function signOutAndRedirect(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}

export async function GET(request: Request) {
  return signOutAndRedirect(request);
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}
