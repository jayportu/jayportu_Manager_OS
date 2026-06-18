import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/dj/heartbeat
 *
 * Marca al DJ logueado como activo AHORA (last_active_at = now del servidor).
 * El cliente <PresenceHeartbeat> lo llama cada ~60s mientras la app está
 * abierta y visible. Alimenta el badge "● LIVE" de Buscar DJs.
 *
 * Usa el client de sesión → RLS permite al dueño actualizar su propia fila.
 * Si el usuario no es DJ (sin fila en dj_profile), el update afecta 0 filas:
 * no-op inofensivo. El timestamp lo pone el servidor (no se confía en input).
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  await supabase
    .from("dj_profile")
    .update({ last_active_at: new Date().toISOString() })
    .eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
