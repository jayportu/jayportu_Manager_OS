/**
 * Cron — nudge de onboarding incompleto.
 * Protegido por CRON_SECRET en header Authorization (lo dispara GitHub Actions,
 * mismo patrón que los otros crons). Público en middleware vía PUBLIC_PATHS.
 *
 * DORMIDO por defecto: corre en DRY-RUN (solo cuenta a quién mandaría, sin
 * enviar) hasta que `ONBOARDING_NUDGE_ENABLED=true`. Forzar dry-run con ?dry=1.
 */
import { NextResponse } from "next/server";
import { runOnboardingNudge } from "@/lib/queries/onboarding-nudge";
import { safeEqual } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado" },
      { status: 500 }
    );
  }
  const auth = req.headers.get("authorization") || "";
  if (!safeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  // Dormido hasta habilitar; ?dry=1 fuerza simulación aunque esté habilitado.
  const enabled = process.env.ONBOARDING_NUDGE_ENABLED === "true";
  const forceDry = new URL(req.url).searchParams.get("dry") === "1";
  const dryRun = !enabled || forceDry;

  const result = await runOnboardingNudge({ dryRun });
  return NextResponse.json({ ok: true, enabled, ...result });
}
