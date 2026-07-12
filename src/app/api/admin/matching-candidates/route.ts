import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { matchDjsForGig } from "@/lib/queries/booker-matching";

/**
 * POST /api/admin/matching-candidates   { gig_id }
 *
 * Lo llama n8n cuando el webhook de Supabase detecta un open_gig nuevo. Devuelve
 * los DJs que calzan (activos, misma ciudad; match de género primero) con datos
 * de contacto para el concierge de matching. Protegido con BOOKER_N8N_SECRET.
 * Whitelisted en middleware. Server-to-server: NO exponer al browser.
 */
export async function POST(req: Request) {
  const expected = process.env.BOOKER_N8N_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "BOOKER_N8N_SECRET no configurado" },
      { status: 500 }
    );
  }
  if (!cronAuthMatches(req, expected)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { gig_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const gigId = typeof body.gig_id === "string" ? body.gig_id.trim() : "";
  if (!gigId) {
    return NextResponse.json({ ok: false, error: "Falta gig_id" }, { status: 400 });
  }

  try {
    const res = await matchDjsForGig(gigId);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
