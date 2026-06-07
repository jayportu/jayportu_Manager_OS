"use server";

/**
 * Fase 2 · Founding Bookers — server actions del backoffice.
 * Crear/enviar invitación VIP (token único) y revocar. Solo admin.
 */
import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import {
  createFoundingInvite,
  markFoundingInviteSent,
  revokeFoundingInvite,
} from "@/lib/queries/founding-invites";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  foundingInviteEmailHtml,
  foundingInviteEmailText,
} from "@/lib/email/templates";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
}

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function sendFoundingInviteAction(
  email: string,
  fullName: string
): Promise<
  Result<{
    inviteUrl: string;
    email: string;
    emailSent: boolean;
    emailError?: string;
  }>
> {
  try {
    const { userId: adminId } = await assertAdmin();
    const created = await createFoundingInvite({
      email,
      fullName,
      invitedBy: adminId,
    });
    if (!created.ok) return { ok: false, error: created.error };

    const inviteUrl = `${getSiteUrl()}/signup/booker?founding=${created.token}`;

    let emailSent = false;
    let emailError: string | undefined;
    if (isResendConfigured()) {
      const sendRes = await sendEmail({
        to: created.email,
        subject: "Tu invitación Founding a DROP.",
        html: foundingInviteEmailHtml({
          fullName: created.fullName,
          inviteUrl,
        }),
        text: foundingInviteEmailText({
          fullName: created.fullName,
          inviteUrl,
        }),
        replyTo: process.env.RESEND_REPLY_TO || undefined,
      });
      if (sendRes.ok) {
        emailSent = true;
        await markFoundingInviteSent(created.id);
      } else {
        emailError = sendRes.error;
      }
    } else {
      emailError = "Resend no configurado — usa 'Copiar link' para enviar manual";
    }

    revalidatePath("/admin/founding-invites");
    return {
      ok: true,
      data: { inviteUrl, email: created.email, emailSent, emailError },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function revokeFoundingInviteAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    await revokeFoundingInvite(id);
    revalidatePath("/admin/founding-invites");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
