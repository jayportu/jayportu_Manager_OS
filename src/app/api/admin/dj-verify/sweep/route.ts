import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAndVerify, MISSING_LABELS } from "@/lib/queries/dj-verify";

/**
 * GET /api/admin/dj-verify/sweep
 *
 * Barrido: itera todos los DJs no verificados y corre evaluateAndVerify en cada
 * uno. Uso: barrido inicial (una vez) y red de seguridad (esporádico) por si el
 * trigger dejó pasar un caso. Idempotente. Protegido con DJ_VERIFY_SECRET.
 */
export async function GET(req: Request) {
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

  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("dj_profile")
    .select("user_id")
    .is("verified_at", null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const verified: Array<{ user_id: string; artist_name: string | null }> = [];
  const needs_review: Array<{ user_id: string; artist_name: string | null; missing: string[] }> = [];
  let not_eligible_count = 0;

  for (const r of rows ?? []) {
    const userId = r.user_id as string;
    try {
      const res = await evaluateAndVerify(userId);
      if (res.decision === "verified") {
        verified.push({ user_id: userId, artist_name: res.artist_name });
      } else if (res.decision === "needs_review") {
        needs_review.push({
          user_id: userId,
          artist_name: res.artist_name,
          missing: res.missing.map((k) => MISSING_LABELS[k]),
        });
      } else {
        not_eligible_count++;
      }
    } catch {
      // un perfil que falla no debe cortar el barrido completo
      not_eligible_count++;
    }
  }

  return NextResponse.json({
    ok: true,
    verified,
    needs_review,
    not_eligible_count,
    total: rows?.length ?? 0,
  });
}
