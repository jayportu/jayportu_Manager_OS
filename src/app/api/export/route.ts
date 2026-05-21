/**
 * GET /api/export
 *
 * Devuelve un JSON con TODOS los datos del usuario autenticado.
 * Pensado como respaldo manual desde día 1.
 *
 * Por ahora solo incluye dj_profile, pero el formato es extensible:
 * cada nueva tabla se agrega como una key más en el objeto raíz.
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // dj_profile (1 fila)
  const { data: dj_profile } = await supabase
    .from("dj_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const payload = {
    meta: {
      app: "JAY Manager OS",
      version: "0.2.0",
      exported_at: new Date().toISOString(),
      user_email: user.email,
      user_id: user.id,
    },
    dj_profile,
    // Próximas tablas (CRM, oportunidades, etc.) se agregan acá.
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
