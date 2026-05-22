/**
 * POST /api/track
 * Endpoint público para registrar eventos del press kit.
 * Recibe { user_id, event, referrer? }.
 *
 * Usa service_role (admin) porque los visitantes son anónimos.
 * Valida que user_id exista en dj_profile antes de aceptar.
 */
import { trackEvent } from "@/lib/queries/presskit";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  PRESSKIT_EVENT_TYPES,
  type PresskitEventType,
} from "@/types/database";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: {
    user_id?: string;
    event?: string;
    referrer?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { user_id, event, referrer } = body;
  if (!user_id || !event) {
    return NextResponse.json(
      { error: "Faltan user_id o event" },
      { status: 400 }
    );
  }

  if (!(PRESSKIT_EVENT_TYPES as readonly string[]).includes(event)) {
    return NextResponse.json({ error: "Event inválido" }, { status: 400 });
  }

  // Validar que el user_id corresponde a un dj_profile real
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("dj_profile")
      .select("user_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "user_id no existe" },
        { status: 404 }
      );
    }
  } catch (e) {
    console.error("track validation error:", e);
    return NextResponse.json(
      { error: "Tracking no configurado en server" },
      { status: 500 }
    );
  }

  const ua = request.headers.get("user-agent") || "";
  const cf = request.headers.get("cf-ipcountry") || "";
  const vc = request.headers.get("x-vercel-ip-country") || "";

  try {
    await trackEvent({
      user_id,
      event: event as PresskitEventType,
      referrer: referrer || "",
      user_agent: ua,
      country: cf || vc || "",
    });
  } catch (e) {
    console.error("trackEvent error:", e);
    return NextResponse.json(
      { error: "No se pudo guardar el evento" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
