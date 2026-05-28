"use server";

/**
 * Admin · Server actions para mandar el correo recordatorio a usuarios beta
 * activos. Personalizado por DJ con artist_name + días restantes (15 - días
 * desde beta_approved_at).
 *
 * Seguridad: assertAdmin() al inicio. La lista se construye via service_role
 * (bypassea RLS) porque necesitamos joinear auth.users.email.
 */

import { assertAdmin } from "@/lib/queries/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  betaReminderEmailHtml,
  betaReminderEmailText,
} from "@/lib/email/templates";
import { logUsageEvent } from "@/lib/queries/beta";

const BETA_DAYS = 15;

export interface BetaReminderRecipient {
  userId: string;
  artistName: string;
  email: string;
  daysRemaining: number;
}

export interface SendResult {
  recipient: BetaReminderRecipient;
  ok: boolean;
  emailId?: string;
  error?: string;
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://jayportu-manager-os.vercel.app"
  );
}

/**
 * Devuelve la lista de DJs beta activos con sus días restantes calculados.
 * No envía nada — sirve para el preview previo al disparo.
 */
export async function listBetaReminderRecipients(): Promise<
  | { ok: true; recipients: BetaReminderRecipient[] }
  | { ok: false; error: string }
> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    const { data: profiles, error: profErr } = await admin
      .from("dj_profile")
      .select("user_id, artist_name, beta_status, beta_approved_at")
      .eq("beta_status", "active")
      .not("beta_approved_at", "is", null)
      .order("beta_approved_at", { ascending: true });
    if (profErr) return { ok: false, error: profErr.message };

    if (!profiles || profiles.length === 0) {
      return { ok: true, recipients: [] };
    }

    // Necesitamos el auth.email para enviar — listUsers de admin auth.
    const userIds = new Set(profiles.map((p) => p.user_id));
    const emailsByUserId = new Map<string, string>();
    let page = 1;
    const perPage = 1000;
    // Paginar por si la cuenta crece, pero el plan free maneja una página.
    // Si en el futuro hay >1000 users, este loop sigue funcionando.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (error) return { ok: false, error: error.message };
      for (const u of data?.users ?? []) {
        if (u.email && userIds.has(u.id)) {
          emailsByUserId.set(u.id, u.email);
        }
      }
      if (!data?.users || data.users.length < perPage) break;
      page += 1;
    }

    const now = Date.now();
    const recipients: BetaReminderRecipient[] = profiles
      .map((p) => {
        const email = emailsByUserId.get(p.user_id);
        if (!email) return null;
        const approvedMs = new Date(p.beta_approved_at as string).getTime();
        const daysSince = Math.floor((now - approvedMs) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, BETA_DAYS - daysSince);
        return {
          userId: p.user_id,
          artistName: (p.artist_name as string) || "DJ",
          email,
          daysRemaining,
        } satisfies BetaReminderRecipient;
      })
      .filter((r): r is BetaReminderRecipient => r !== null);

    return { ok: true, recipients };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Manda el correo recordatorio personalizado a TODOS los DJs beta activos.
 * Devuelve resultado por destinatario para que el admin vea qué pasó.
 *
 * Falla suave: si un envío individual falla, los demás continúan.
 */
export async function sendBetaReminderToAllAction(): Promise<
  | {
      ok: true;
      sent: number;
      failed: number;
      results: SendResult[];
    }
  | { ok: false; error: string }
> {
  try {
    await assertAdmin();

    if (!isResendConfigured()) {
      return {
        ok: false,
        error:
          "Resend no está configurado en este entorno (faltan RESEND_API_KEY o RESEND_FROM_EMAIL).",
      };
    }

    const list = await listBetaReminderRecipients();
    if (!list.ok) return { ok: false, error: list.error };
    const { recipients } = list;

    if (recipients.length === 0) {
      return { ok: true, sent: 0, failed: 0, results: [] };
    }

    const siteUrl = getSiteUrl();
    const dashboardUrl = `${siteUrl}/dashboard`;
    const results: SendResult[] = [];
    let sent = 0;
    let failed = 0;

    // Envío secuencial para no chocar con rate limits del plan free de
    // Resend (2 req/seg). 9 destinatarios → ~5 seg total. Aceptable.
    for (const recipient of recipients) {
      const html = betaReminderEmailHtml({
        artistName: recipient.artistName,
        daysRemaining: recipient.daysRemaining,
        dashboardUrl,
      });
      const text = betaReminderEmailText({
        artistName: recipient.artistName,
        daysRemaining: recipient.daysRemaining,
        dashboardUrl,
      });
      const subject = `Tu beta de DROP — quedan ${recipient.daysRemaining} ${
        recipient.daysRemaining === 1 ? "día" : "días"
      }`;

      const res = await sendEmail({
        to: recipient.email,
        subject,
        html,
        text,
        replyTo: process.env.RESEND_REPLY_TO || "hola@jayportu.com",
      });

      if (res.ok) {
        sent += 1;
        results.push({ recipient, ok: true, emailId: res.id });
        await logUsageEvent({
          event: "beta_reminder_sent",
          page: "/admin/beta-reminder",
          metadata: {
            recipient_user_id: recipient.userId,
            recipient_artist_name: recipient.artistName,
            recipient_email: recipient.email,
            days_remaining: recipient.daysRemaining,
            resend_email_id: res.id,
          },
        });
      } else {
        failed += 1;
        results.push({ recipient, ok: false, error: res.error });
        await logUsageEvent({
          event: "beta_reminder_failed",
          page: "/admin/beta-reminder",
          metadata: {
            recipient_user_id: recipient.userId,
            recipient_artist_name: recipient.artistName,
            recipient_email: recipient.email,
            days_remaining: recipient.daysRemaining,
            error: res.error,
          },
        });
      }

      // Pequeña pausa entre envíos (rate limit safety, 2 req/seg en free).
      await new Promise((r) => setTimeout(r, 600));
    }

    // Evento resumen del batch
    await logUsageEvent({
      event: "beta_reminder_batch_done",
      page: "/admin/beta-reminder",
      metadata: {
        total: recipients.length,
        sent,
        failed,
      },
    });

    return { ok: true, sent, failed, results };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
