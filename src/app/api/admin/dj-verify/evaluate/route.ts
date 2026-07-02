import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { evaluateAndVerify } from "@/lib/queries/dj-verify";

/**
 * POST /api/admin/dj-verify/evaluate  { user_id }
 *
 * Camino event-driven: lo llama n8n cuando el trigger de dj_profile detecta un
 * cambio relevante. Reevalúa a ese DJ y —si 4/4— lo verifica.
 * Protegido con DJ_VERIFY_SECRET en header Authorization: Bearer <secret>.
 * Marcado público en middleware (PUBLIC_PATHS).
 */
export async function POST(req: Request) {
  const expected = process.env.DJ_VERIFY_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "DJ_VERIFY_SECRET no configurado" },
      { status: 500 }
    );
  }
  if (!cronAuthMatches(req, expected)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  let body: { user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }
  // Tolerar body malformado: un user_id no-string (ej. número) devuelve 400
  // limpio en vez de reventar con un 500 sin estructura.
  const userId = typeof body.user_id === "string" ? body.user_id.trim() : "";
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Falta user_id" }, { status: 400 });
  }

  try {
    const res = await evaluateAndVerify(userId);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
