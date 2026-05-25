/**
 * Sprint 23.5 — Endpoint que recibe respuestas NPS desde el modal.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNpsResponse } from "@/lib/queries/beta";
import { NPS_MILESTONES, type NpsMilestone } from "@/types/database";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "No autenticado" },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON inválido" },
      { status: 400 }
    );
  }

  const milestone = body.milestone as NpsMilestone;
  if (!NPS_MILESTONES.includes(milestone)) {
    return NextResponse.json(
      { ok: false, error: "Hito inválido" },
      { status: 400 }
    );
  }
  const score =
    typeof body.score === "number" ? body.score : Number(body.score);
  if (!Number.isInteger(score) || score < 0 || score > 10) {
    return NextResponse.json(
      { ok: false, error: "Score debe ser un entero 0-10" },
      { status: 400 }
    );
  }
  const comment = typeof body.comment === "string" ? body.comment : "";

  try {
    await createNpsResponse({ milestone, score, comment });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    // Si es violación de unique (ya respondió), devolver mensaje claro
    if (msg.includes("duplicate") || msg.includes("unique")) {
      return NextResponse.json(
        { ok: false, error: "Ya respondiste este hito." },
        { status: 409 }
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
