import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { verifyBookerByAdmin } from "@/lib/queries/booker-verify";

/**
 * POST /api/admin/booker-verify   { user_id, verified_by? }
 *
 * Lo llama n8n tras aprobar un booker en su cola de triage. Verifica la cuenta
 * (verified_at) vía service_role. Protegido con BOOKER_N8N_SECRET en header
 * Authorization: Bearer <secret>. Whitelisted en middleware (PUBLIC_PATHS).
 * Idempotente: si ya estaba verificado, responde ok/already_verified.
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

  let body: { user_id?: unknown; verified_by?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Falta user_id" }, { status: 400 });
  }
  const verifiedBy =
    typeof body.verified_by === "string" && body.verified_by.trim()
      ? body.verified_by.trim()
      : null;

  try {
    const res = await verifyBookerByAdmin(userId, verifiedBy);
    return NextResponse.json(res, { status: res.ok ? 200 : 404 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
