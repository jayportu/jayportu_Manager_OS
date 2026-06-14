import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Cerrar sesión vía POST a /logout. Redirige al LANDING público (/).
 *
 * SEGURIDAD: solo el POST cierra sesión. Antes el GET también lo hacía, lo
 * que permitía un CSRF de logout (un `<img src="/logout">` o link malicioso
 * desconectaba al usuario sin su intención). El GET ahora solo redirige al
 * landing sin tocar la sesión — inofensivo. Todos los botones "Cerrar sesión"
 * de la app hacen POST (formulario o fetch).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

// GET no muta sesión: redirige al landing (mata el vector de CSRF por prefetch/img).
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/", request.url));
}
