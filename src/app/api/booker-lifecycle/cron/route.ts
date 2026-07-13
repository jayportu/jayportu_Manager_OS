/**
 * Cron — lifecycle del booker (F4). Un solo endpoint corre los 4 jobs
 * (noResponde, favorito, sinBooking, inactivo30d), cada uno gateado por su
 * propio flag `BOOKER_*_ENABLED`. Protegido por CRON_SECRET en header
 * Authorization (lo dispara GitHub Actions, mismo patrón que los otros crons).
 * Público en middleware vía PUBLIC_PATHS.
 *
 * DORMIDO por defecto: cada job corre en DRY-RUN (solo cuenta a quién mandaría)
 * hasta que su flag esté en "true". `?dry=1` fuerza dry-run global.
 */
import { NextResponse } from "next/server";
import { cronAuthMatches } from "@/lib/cron-auth";
import { runBookerLifecycle } from "@/lib/queries/booker-lifecycle";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado" },
      { status: 500 }
    );
  }
  if (!cronAuthMatches(req, expected)) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const forceDry = new URL(req.url).searchParams.get("dry") === "1";
  const flags = {
    noResponde: process.env.BOOKER_NORESPONDE_ENABLED === "true",
    favorito: process.env.BOOKER_FAVORITO_ENABLED === "true",
    sinBooking: process.env.BOOKER_SINBOOKING_ENABLED === "true",
    inactivo30d: process.env.BOOKER_INACTIVO30D_ENABLED === "true",
  };

  const result = await runBookerLifecycle({ flags, forceDry });
  return NextResponse.json({ ok: true, forceDry, flags, ...result });
}
