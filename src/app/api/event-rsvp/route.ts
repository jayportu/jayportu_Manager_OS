/**
 * POST /api/event-rsvp — RSVP público de un fan (sin cuenta) a un evento.
 * Recibe { token, name, email, status, notifyFuture }. Rate-limited por IP.
 */
import { createRsvp } from "@/lib/queries/events";
import { rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limit = rateLimit(request, { key: "event-rsvp", max: 20, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: {
    token?: string;
    name?: string;
    email?: string;
    status?: string;
    notifyFuture?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Body inválido" }, { status: 400 });
  }

  if (!body.token || !body.email) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos" },
      { status: 400 }
    );
  }

  const result = await createRsvp({
    token: String(body.token),
    name: String(body.name ?? ""),
    email: String(body.email),
    status: body.status === "maybe" ? "maybe" : "going",
    notifyFuture: !!body.notifyFuture,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, going_count: result.going_count });
}
