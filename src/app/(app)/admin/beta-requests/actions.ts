"use server";

/**
 * Sprint 23.5 — Server actions del workflow admin de solicitudes beta.
 */

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import {
  updateBetaRequestStatus,
  markInviteSent,
} from "@/lib/queries/beta";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  betaInviteEmailHtml,
  betaInviteEmailText,
  betaRejectionEmailHtml,
  betaRejectionEmailText,
} from "@/lib/email/templates";
import type { BetaRequestStatus } from "@/types/database";

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://dropgigs.com"
  );
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function approveBetaRequestAction(
  id: string
): Promise<
  Result<{
    invite_token: string;
    email: string;
    artist_name: string;
    email_sent: boolean;
    email_error?: string;
  }>
> {
  try {
    await assertAdmin();
    const updated = await updateBetaRequestStatus(id, "approved");
    if (!updated.invite_token) {
      return { ok: false, error: "Token no se generó" };
    }

    // Intentar enviar email automático si Resend está configurado.
    // Si falla o no está configurado, no es bloqueante — el admin tiene
    // el botón "Copiar invite" como fallback manual.
    let emailSent = false;
    let emailError: string | undefined;
    if (isResendConfigured()) {
      const inviteUrl = `${getSiteUrl()}/login?invite=${updated.invite_token}`;
      const html = betaInviteEmailHtml({
        artistName: updated.artist_name,
        inviteUrl,
      });
      const text = betaInviteEmailText({
        artistName: updated.artist_name,
        inviteUrl,
      });
      const sendRes = await sendEmail({
        to: updated.email,
        subject: "Tu acceso a DROP — bienvenido a la beta",
        html,
        text,
        replyTo: process.env.RESEND_REPLY_TO || undefined,
      });
      if (sendRes.ok) {
        emailSent = true;
        await markInviteSent(id);
      } else {
        emailError = sendRes.error;
      }
    } else {
      emailError = "Resend no configurado — usa 'Copiar invite' para enviar manual";
    }

    revalidatePath("/admin/beta-requests");
    return {
      ok: true,
      data: {
        invite_token: updated.invite_token,
        email: updated.email,
        artist_name: updated.artist_name,
        email_sent: emailSent,
        email_error: emailError,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/** Reenvía el email de invitación (botón "Reenviar email" en la tabla). */
export async function resendInviteEmailAction(
  id: string
): Promise<Result<{ ok: boolean; error?: string }>> {
  try {
    await assertAdmin();
    if (!isResendConfigured()) {
      return {
        ok: false,
        error: "Resend no configurado. Setea RESEND_API_KEY + RESEND_FROM_EMAIL en Vercel.",
      };
    }
    const admin = createAdminClient();
    const { data } = await admin
      .from("beta_requests")
      .select("artist_name, email, invite_token")
      .eq("id", id)
      .single();
    if (!data) return { ok: false, error: "Solicitud no encontrada" };
    const r = data as {
      artist_name: string;
      email: string;
      invite_token: string | null;
    };
    if (!r.invite_token) return { ok: false, error: "Sin invite_token" };
    const inviteUrl = `${getSiteUrl()}/login?invite=${r.invite_token}`;
    const sendRes = await sendEmail({
      to: r.email,
      subject: "Recordatorio sobre tu acceso a DROP",
      html: betaInviteEmailHtml({
        artistName: r.artist_name,
        inviteUrl,
      }),
      text: betaInviteEmailText({
        artistName: r.artist_name,
        inviteUrl,
      }),
      replyTo: process.env.RESEND_REPLY_TO || undefined,
    });
    if (!sendRes.ok) {
      return { ok: false, error: sendRes.error };
    }
    await markInviteSent(id);
    revalidatePath("/admin/beta-requests");
    return { ok: true, data: { ok: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function rejectBetaRequestAction(
  id: string,
  reason?: string
): Promise<Result<null>> {
  try {
    await assertAdmin();
    const updated = await updateBetaRequestStatus(id, "rejected", reason);
    if (isResendConfigured()) {
      const html = betaRejectionEmailHtml({ artistName: updated.artist_name, reason });
      const text = betaRejectionEmailText({ artistName: updated.artist_name, reason });
      await sendEmail({
        to: updated.email,
        subject: "Tu solicitud a DROP.",
        html,
        text,
        replyTo: process.env.RESEND_REPLY_TO || undefined,
      });
    }
    revalidatePath("/admin/beta-requests");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function waitlistBetaRequestAction(
  id: string
): Promise<Result<null>> {
  try {
    await assertAdmin();
    await updateBetaRequestStatus(id, "waitlist");
    revalidatePath("/admin/beta-requests");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Marca el invite como enviado (cuando el admin copia el link).
 * Por ahora "enviar email" es: copiar el link y mandarlo manualmente.
 * Sprint G implementará el envío automático vía Gmail conectado.
 */
export async function markInviteSentAction(
  id: string
): Promise<Result<null>> {
  try {
    await assertAdmin();
    await markInviteSent(id);
    revalidatePath("/admin/beta-requests");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Cambia un status arbitrario (para volver de waitlist a approved, etc).
 */
export async function setBetaRequestStatusAction(
  id: string,
  status: BetaRequestStatus
): Promise<Result<null>> {
  try {
    await assertAdmin();
    await updateBetaRequestStatus(id, status);
    revalidatePath("/admin/beta-requests");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Borra una solicitud (cleanup admin, solo para spam evidente).
 */
export async function deleteBetaRequestAction(
  id: string
): Promise<Result<null>> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    await admin.from("beta_requests").delete().eq("id", id);
    revalidatePath("/admin/beta-requests");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
