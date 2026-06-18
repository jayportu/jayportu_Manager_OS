/**
 * POST /api/growth/sync-cron
 *
 * Endpoint público pero protegido con CRON_SECRET en header Authorization.
 * Llamado por GitHub Actions diariamente.
 *
 * Recorre platform_accounts con auto_sync_enabled=true y crea snapshots
 * automáticos por cada cuenta externa (SoundCloud, etc.).
 */
import { syncAllAutoAccounts } from "@/lib/integrations/sync-job";
import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en servidor" },
      { status: 500 }
    );
  }
  if (!safeEqual(auth, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const r = await syncAllAutoAccounts();
    return NextResponse.json({
      ok: true,
      total: r.total,
      ok_count: r.ok_count,
      error_count: r.error_count,
      results: r.results,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
