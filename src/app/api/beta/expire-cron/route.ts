/**
 * Sprint 23.5 — Cron diario que expira beta users vencidos.
 *
 * Lógica:
 *   - Busca users con beta_status='active' y beta_approved_at < (now - 15 días)
 *   - Los marca como beta_status='expired'
 *   - (futuro) Manda email "tu beta terminó, contáctame para suscribirte"
 *
 * Protegido por CRON_SECRET en header Authorization. Llamado por
 * GitHub Actions diariamente a las 12:00 UTC (08:00 Santiago).
 *
 * Endpoint marcado público en middleware via PUBLIC_PATHS (igual que
 * /api/gmail/sync-cron, /api/growth/sync-cron, /api/push/send-cron).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";

const BETA_LENGTH_DAYS = 15;

export async function GET(req: Request) {
  // Protección CRON_SECRET
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET no configurado en servidor" },
      { status: 500 }
    );
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Cutoff: hace 15 días desde ahora
  const cutoffIso = new Date(
    Date.now() - BETA_LENGTH_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // Buscar todos los users beta activos cuya aprobación es anterior al cutoff
  const { data: candidates, error: selectErr } = await admin
    .from("dj_profile")
    .select("user_id, artist_name, beta_approved_at")
    .eq("beta_status", "active")
    .lt("beta_approved_at", cutoffIso);

  if (selectErr) {
    return NextResponse.json(
      { ok: false, error: selectErr.message },
      { status: 500 }
    );
  }

  const expired = (candidates || []) as Array<{
    user_id: string;
    artist_name: string;
    beta_approved_at: string;
  }>;

  if (expired.length === 0) {
    return NextResponse.json({
      ok: true,
      expired_count: 0,
      message: "Ningún user beta vencido hoy.",
    });
  }

  // Actualizar status a 'expired'
  const userIds = expired.map((u) => u.user_id);
  const { error: updateErr } = await admin
    .from("dj_profile")
    .update({ beta_status: "expired" })
    .in("user_id", userIds);

  if (updateErr) {
    return NextResponse.json(
      { ok: false, error: updateErr.message, partial: expired.length },
      { status: 500 }
    );
  }

  // Buscar emails de los users expirados para mandar el aviso
  let emailsSent = 0;
  if (isResendConfigured()) {
    // Sacar emails desde auth.users via service_role
    const { data: users } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const userEmailMap = new Map<string, string>();
    for (const u of users?.users || []) {
      if (u.id && u.email) userEmailMap.set(u.id, u.email);
    }

    for (const u of expired) {
      const email = userEmailMap.get(u.user_id);
      if (!email) continue;
      const res = await sendEmail({
        to: email,
        subject: "Tus 15 días de beta en DROP llegaron a su fin",
        html: betaExpiredEmailHtml(u.artist_name),
        text: betaExpiredEmailText(u.artist_name),
        replyTo: process.env.RESEND_REPLY_TO || undefined,
      });
      if (res.ok) emailsSent++;
    }
  }

  return NextResponse.json({
    ok: true,
    expired_count: expired.length,
    emails_sent: emailsSent,
    user_ids: userIds,
  });
}

function betaExpiredEmailHtml(artistName: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:#F4EFE7;font-family:-apple-system,Inter,system-ui,sans-serif;color:#0A0A0A;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4EFE7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;width:100%;background:#fff;border:3px solid #0A0A0A;">
  <tr><td style="padding:32px 32px 0;">
    <div style="font-family:monospace;font-size:11px;font-weight:700;letter-spacing:2px;color:#FF5C00;text-transform:uppercase;">— BETA TERMINÓ</div>
    <div style="font-family:Impact,'Anton',sans-serif;font-size:48px;line-height:0.9;margin-top:8px;">GRACIAS<span style="color:#FF5C00;">.</span></div>
  </td></tr>
  <tr><td style="padding:24px 32px;">
    <p style="font-size:17px;line-height:1.5;margin:0 0 16px;">Hola <strong>${escapeHtml(artistName)}</strong>,</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Tus 15 días de beta en DROP. terminaron. Gracias por probar la app y por todo el feedback.</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;"><strong>Tu cuenta sigue ahí.</strong> Puedes entrar a verla, pero no podrás crear contactos, tracklists o agenda nuevos hasta que abramos las suscripciones (Sprint 24).</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;">Si quieres ser el primero en suscribirte cuando esté disponible, respóndeme este email con "QUIERO".</p>
    <p style="font-size:14px;line-height:1.5;margin:24px 0 0;">— Jay Portu</p>
  </td></tr>
  <tr><td style="border-top:2px solid #0A0A0A;padding:16px 32px;background:#F4EFE7;">
    <div style="font-family:monospace;font-size:10px;letter-spacing:2px;color:#7A7670;text-transform:uppercase;text-align:center;">DROP. · THE DJ OS · MADE IN SANTIAGO</div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function betaExpiredEmailText(artistName: string): string {
  return `Hola ${artistName},

Tus 15 días de beta en DROP. terminaron. Gracias por probar la app y por todo el feedback.

Tu cuenta sigue ahí. Puedes entrar a verla, pero no podrás crear contactos, tracklists o agenda nuevos hasta que abramos las suscripciones (Sprint 24).

Si quieres ser el primero en suscribirte cuando esté disponible, respóndeme este email con "QUIERO".

— Jay Portu

— DROP. · THE DJ OS · MADE IN SANTIAGO`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
