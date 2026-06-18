/**
 * Sprint RA-3 Fase 3 — Cron diario de notificaciones de updates de DJs.
 *
 * Corre 1 vez al día (ver .github/workflows/follow-updates.yml). Lee
 * dj_update_events sin notificar, agrupa por DJ y manda un email digest
 * a cada follower con notify_email=true.
 *
 * Lógica:
 *   1. Query dj_update_events where notified_at is null AND
 *      created_at > now() - interval '7 days' (no rezagados muy viejos).
 *   2. Group by dj_user_id.
 *   3. For each DJ con events pendientes:
 *      a. Get followers (booker_favorites con notify_email=true).
 *      b. Resolver emails via auth.admin.listUsers (paginado).
 *      c. Mandar un email aggregate por follower con todos los updates.
 *      d. Log a usage_events (follow_notif_sent / _failed).
 *   4. Marcar events.notified_at = now().
 *
 * Anti-spam: máximo 1 email por DJ por follower por corrida del cron
 * (que corre 1x/día → max 1 email por DJ por día). Si el cron falla a
 * mitad, los events quedan sin marcar y se procesan en la próxima corrida.
 *
 * Protegido por CRON_SECRET en Authorization header.
 */

import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  followUpdatesEmailHtml,
  followUpdatesEmailText,
  type FollowUpdate,
} from "@/lib/email/templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface DjEventRow {
  id: string;
  dj_user_id: string;
  type: "show_scheduled" | "availability_updated";
  payload: Record<string, unknown>;
  created_at: string;
}

interface DjProfileRow {
  user_id: string;
  artist_name: string;
  public_slug: string;
}

interface FollowerRow {
  user_id: string;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://dropgigs.com"
  );
}

/** Formatea un event en un line item legible para el email. */
function eventToUpdate(ev: DjEventRow): FollowUpdate {
  if (ev.type === "show_scheduled") {
    const p = ev.payload as {
      title?: string;
      venue?: string | null;
      event_date?: string | null;
    };
    const fechaIso = p.event_date;
    let fecha = "";
    if (fechaIso) {
      try {
        fecha = new Date(fechaIso).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      } catch {
        fecha = fechaIso;
      }
    }
    const title = "Agendó un show nuevo";
    const parts: string[] = [];
    if (p.title) parts.push(p.title);
    if (fecha) parts.push(fecha);
    return { type: "show_scheduled", title, detail: parts.join(" · ") };
  }
  // availability_updated
  const p = ev.payload as {
    available_from?: string | null;
    available_until?: string | null;
    available_note?: string;
  };
  const formatDate = (iso?: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("es-CL", {
          day: "numeric",
          month: "long",
        })
      : "";
  const range = [formatDate(p.available_from), formatDate(p.available_until)]
    .filter(Boolean)
    .join(" — ");
  return {
    type: "availability_updated",
    title: "Publicó disponibilidad nueva",
    detail: range || p.available_note || undefined,
  };
}

interface ResultSummary {
  events_processed: number;
  djs_with_events: number;
  emails_sent: number;
  emails_failed: number;
  errors: string[];
}

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
    return NextResponse.json(
      { ok: false, error: "No autorizado" },
      { status: 401 }
    );
  }

  if (!isResendConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Resend no configurado en este entorno" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const siteUrl = getSiteUrl();
  const dashboardUrl = `${siteUrl}/dashboard`;
  const summary: ResultSummary = {
    events_processed: 0,
    djs_with_events: 0,
    emails_sent: 0,
    emails_failed: 0,
    errors: [],
  };

  // 1. Pull pending events (últimos 7 días para no procesar rezagados muy viejos)
  const cutoffIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rawEvents, error: evErr } = await admin
    .from("dj_update_events")
    .select("id, dj_user_id, type, payload, created_at")
    .is("notified_at", null)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: true });
  if (evErr) {
    summary.errors.push(`fetch events: ${evErr.message}`);
    return NextResponse.json({ ok: false, summary }, { status: 500 });
  }
  const events = (rawEvents ?? []) as DjEventRow[];
  if (events.length === 0) {
    return NextResponse.json({ ok: true, summary });
  }

  // 2. Group by dj
  const byDj = new Map<string, DjEventRow[]>();
  for (const ev of events) {
    const list = byDj.get(ev.dj_user_id) ?? [];
    list.push(ev);
    byDj.set(ev.dj_user_id, list);
  }
  summary.djs_with_events = byDj.size;
  summary.events_processed = events.length;

  // 3. Resolver perfiles de DJs (artist_name + public_slug)
  const djIds = Array.from(byDj.keys());
  const { data: profiles } = await admin
    .from("dj_profile")
    .select("user_id, artist_name, public_slug")
    .in("user_id", djIds);
  const djById = new Map<string, DjProfileRow>(
    (profiles ?? []).map((p) => [
      (p as DjProfileRow).user_id,
      p as DjProfileRow,
    ])
  );

  // 4. Resolver emails de followers (puede tener varios users) — paginado
  const allFollowerIds = new Set<string>();
  const followersByDj = new Map<string, string[]>();
  for (const djId of djIds) {
    const { data: followers } = await admin
      .from("booker_favorites")
      .select("user_id")
      .eq("dj_user_id", djId)
      .eq("notify_email", true);
    const ids = ((followers ?? []) as FollowerRow[]).map((f) => f.user_id);
    followersByDj.set(djId, ids);
    ids.forEach((id) => allFollowerIds.add(id));
  }

  const emailsByUser = new Map<string, string>();
  if (allFollowerIds.size > 0) {
    let page = 1;
    const perPage = 1000;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) {
        summary.errors.push(`listUsers: ${error.message}`);
        break;
      }
      for (const u of data?.users ?? []) {
        if (u.email && allFollowerIds.has(u.id)) {
          emailsByUser.set(u.id, u.email);
        }
      }
      if (!data?.users || data.users.length < perPage) break;
      page += 1;
    }
  }

  // 5. Loop: por DJ → por follower, mandar email
  const processedEventIds: string[] = [];
  for (const [djId, djEvents] of Array.from(byDj.entries())) {
    const dj = djById.get(djId);
    if (!dj) {
      summary.errors.push(`profile not found for dj ${djId}`);
      // Marcamos los events para no reintentar — DJ borrado o sin perfil.
      djEvents.forEach((e) => processedEventIds.push(e.id));
      continue;
    }
    const followerIds = followersByDj.get(djId) ?? [];
    if (followerIds.length === 0) {
      // Sin followers con notify_email — solo marcar events como notified.
      djEvents.forEach((e) => processedEventIds.push(e.id));
      continue;
    }

    const updates = djEvents.map(eventToUpdate);

    for (const followerId of followerIds) {
      const email = emailsByUser.get(followerId);
      if (!email) {
        summary.errors.push(`email not found for follower ${followerId}`);
        continue;
      }

      // bookerName: usamos solo el local-part del email como fallback;
      // los bookers no tienen artist_name. (Mejora futura: leer booker_accounts.full_name)
      const bookerName = email.split("@")[0] || "Booker";

      const subject = `${dj.artist_name} actualizó su agenda`;
      const html = followUpdatesEmailHtml({
        bookerName,
        djArtistName: dj.artist_name,
        djSlug: dj.public_slug,
        updates,
        dashboardUrl,
        siteUrl,
      });
      const text = followUpdatesEmailText({
        bookerName,
        djArtistName: dj.artist_name,
        djSlug: dj.public_slug,
        updates,
        siteUrl,
      });

      const res = await sendEmail({
        to: email,
        subject,
        html,
        text,
        replyTo: process.env.RESEND_REPLY_TO || "hola@dropgigs.com",
      });

      if (res.ok) {
        summary.emails_sent += 1;
        await admin.from("usage_events").insert({
          user_id: followerId,
          event: "follow_notif_sent",
          page: "/api/follow-updates/cron",
          metadata: {
            dj_user_id: djId,
            dj_artist_name: dj.artist_name,
            updates_count: updates.length,
            resend_email_id: res.id,
          },
        });
      } else {
        summary.emails_failed += 1;
        summary.errors.push(
          `send to ${email} (dj ${dj.artist_name}): ${res.error}`
        );
        await admin.from("usage_events").insert({
          user_id: followerId,
          event: "follow_notif_failed",
          page: "/api/follow-updates/cron",
          metadata: {
            dj_user_id: djId,
            dj_artist_name: dj.artist_name,
            error: res.error,
          },
        });
      }

      // Pausa breve para respetar rate limit del plan free de Resend.
      await new Promise((r) => setTimeout(r, 600));
    }

    // Marcar events de este DJ como notified
    djEvents.forEach((e) => processedEventIds.push(e.id));
  }

  // 6. Marcar todos los events procesados (incluso los sin followers)
  if (processedEventIds.length > 0) {
    const { error: updErr } = await admin
      .from("dj_update_events")
      .update({ notified_at: new Date().toISOString() })
      .in("id", processedEventIds);
    if (updErr) summary.errors.push(`mark notified: ${updErr.message}`);
  }

  return NextResponse.json({ ok: true, summary });
}
