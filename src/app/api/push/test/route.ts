/**
 * POST /api/push/test
 *
 * Envía un push de prueba al user logueado (a todos sus dispositivos
 * subscritos). Útil para validar que la cadena VAPID → SW → notificación
 * funciona antes de meter triggers reales.
 */
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  try {
    const result = await sendPushToUser(user.id, {
      title: "DROP. — Prueba",
      body: "Si ves esto, las notificaciones funcionan en este dispositivo.",
      url: "/configuracion",
      tag: "test",
    });

    if (result.total === 0) {
      return NextResponse.json(
        { error: "No tienes ningún dispositivo subscrito" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      total: result.total,
      errors: result.errors,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
