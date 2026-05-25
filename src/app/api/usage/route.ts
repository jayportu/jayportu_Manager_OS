/**
 * Sprint 23.5 — Endpoint POST /api/usage para registrar eventos de uso.
 *
 * Cero cookies de terceros, cero GA. Solo persistimos { user_id, event,
 * page, metadata }. Best-effort: si falla, no rompe la UX del cliente.
 */

import { NextResponse } from "next/server";
import { logUsageEvent } from "@/lib/queries/beta";

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = typeof body.event === "string" ? body.event : "";
  if (!event) {
    return NextResponse.json(
      { ok: false, error: "missing event" },
      { status: 400 }
    );
  }
  try {
    await logUsageEvent({
      event,
      page: typeof body.page === "string" ? body.page : "",
      metadata:
        body.metadata && typeof body.metadata === "object"
          ? (body.metadata as Record<string, unknown>)
          : {},
    });
    return NextResponse.json({ ok: true });
  } catch {
    // Best-effort: tracking nunca falla la UX
    return NextResponse.json({ ok: true });
  }
}
