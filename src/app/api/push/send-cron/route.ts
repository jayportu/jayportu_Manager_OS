/**
 * POST /api/push/send-cron
 *
 * Endpoint protegido por CRON_SECRET. Llamado por GitHub Actions diariamente.
 * Evalúa los 3 triggers para cada user con push_subscriptions activas:
 *
 *  1. Follow-ups vencidos hoy o antes (CRM)
 *  2. Delta de seguidores SoundCloud > 5 desde último snapshot anterior
 *  3. Recordatorio semanal (solo lunes): "revisa tus stats de la semana"
 *
 * Cada trigger se envía con tag distinto para que el navegador agrupe
 * en lugar de apilar. No envía si no hay nada relevante.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUser, type PushPayload } from "@/lib/push/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function buildTriggers(userId: string): Promise<PushPayload[]> {
  const admin = createAdminClient();
  const out: PushPayload[] = [];

  // ─── Trigger 1: follow-ups vencidos ─────────────────────────────────
  const nowIso = new Date().toISOString();
  const { count: overdueCount } = await admin
    .from("follow_ups")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("completed_at", null)
    .lte("due_at", nowIso);

  if (overdueCount && overdueCount > 0) {
    out.push({
      title: "Follow-ups atrasados",
      body:
        overdueCount === 1
          ? "Tienes 1 follow-up vencido en el CRM."
          : `Tienes ${overdueCount} follow-ups vencidos en el CRM.`,
      url: "/crm",
      tag: "followups-overdue",
    });
  }

  // ─── Trigger 2: delta SoundCloud > 5 en últimas 24h ─────────────────
  const { data: snapshots } = await admin
    .from("platform_snapshots")
    .select("followers, snapshot_at")
    .eq("user_id", userId)
    .eq("platform", "soundcloud")
    .order("snapshot_at", { ascending: false })
    .limit(2);

  if (snapshots && snapshots.length === 2) {
    const current = snapshots[0] as { followers: number | null; snapshot_at: string };
    const previous = snapshots[1] as { followers: number | null; snapshot_at: string };
    if (
      current.followers != null &&
      previous.followers != null &&
      current.followers - previous.followers >= 5
    ) {
      const delta = current.followers - previous.followers;
      out.push({
        title: "🔥 Subiste en SoundCloud",
        body: `+${delta} seguidores nuevos. Total: ${current.followers}.`,
        url: "/growth",
        tag: "growth-delta-sc",
      });
    }
  }

  // ─── Trigger 3: recordatorio lunes ──────────────────────────────────
  const today = new Date();
  if (today.getUTCDay() === 1) {
    // 0=Dom, 1=Lun. UTC para consistencia con el cron schedule.
    out.push({
      title: "Lunes — revisa tus stats",
      body: "Buen momento para registrar tus seguidores y planear contenido.",
      url: "/growth",
      tag: "weekly-monday",
    });
  }

  return out;
}

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
    const admin = createAdminClient();
    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("user_id");
    if (error) throw new Error(error.message);

    const userIds = Array.from(new Set((subs || []).map((s) => s.user_id)));

    const summary: Array<{
      user_id: string;
      pushes: number;
      sent: number;
      failed: number;
    }> = [];

    for (const userId of userIds) {
      const payloads = await buildTriggers(userId);
      if (payloads.length === 0) {
        summary.push({ user_id: userId, pushes: 0, sent: 0, failed: 0 });
        continue;
      }
      let sent = 0;
      let failed = 0;
      for (const payload of payloads) {
        const r = await sendPushToUser(userId, payload);
        sent += r.sent;
        failed += r.failed;
      }
      summary.push({ user_id: userId, pushes: payloads.length, sent, failed });
    }

    return NextResponse.json({
      ok: true,
      users_evaluated: userIds.length,
      summary,
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
