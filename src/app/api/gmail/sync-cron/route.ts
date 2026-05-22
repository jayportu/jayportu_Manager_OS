/**
 * POST /api/gmail/sync-cron
 *
 * Endpoint público pero protegido con CRON_SECRET en header Authorization.
 * Llamado por GitHub Actions cada hora.
 *
 * Sincroniza Google Calendar para TODOS los users con conexión activa.
 */
import { syncEventsForAllUsers } from "@/lib/calendar/sync-job";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // segundos

export async function POST(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en servidor" },
      { status: 500 }
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncEventsForAllUsers();
    const totalPulled = result.results.reduce(
      (acc, r) => acc + r.pulled,
      0
    );
    return NextResponse.json({
      ok: true,
      users: result.users,
      totalPulled,
      results: result.results.map((r) => ({
        ok: r.ok,
        pulled: r.pulled,
        error: r.error,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

// Permitir también GET para test manual (con el mismo auth)
export async function GET(request: Request) {
  return POST(request);
}
