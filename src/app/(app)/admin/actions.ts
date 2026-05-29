"use server";

/**
 * Sprint S20 — Server actions del backoffice general (no las de
 * beta-requests/beta-reminder/feedback que tienen su propio archivo).
 */

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  needsBetaRequestEmailHtml,
  needsBetaRequestEmailText,
} from "@/lib/email/templates";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

function getBetaUrl(): string {
  // Sprint S20 — dropgigs.com es el dominio canónico de aquí en adelante.
  // Si la env var no está seteada en local, caemos al dominio público real
  // (no a Vercel preview, porque el email lo verá el destinatario, no nos).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
  return `${siteUrl}/beta`;
}

/**
 * "Limpiar cuenta huérfana": le manda un email cordial al user indicando
 * que necesita solicitar acceso a la beta, y borra la cuenta de auth.users
 * (cascade limpia dj_profile y todas las tablas relacionadas vía FK).
 *
 * Usado para usuarios pre-Sprint-S20 que crearon cuenta antes de cerrar el
 * signup (ej. cifratalo@gmail.com). Con el trigger DB de 0029 ya no debería
 * crearse más cuentas huérfanas, pero dejamos esta acción como salvaguarda.
 *
 * Salvaguardas:
 *   - Rechaza si el user es is_admin (no borramos admins por accidente)
 *   - Rechaza si el user ya completó onboarding (no es "huérfano")
 *   - Email es best-effort: si Resend falla, igual borramos la cuenta y
 *     reportamos el error en el resultado para que el admin sepa.
 */
export async function notifyAndDeleteUserAction(
  userId: string
): Promise<
  Result<{
    email: string;
    email_sent: boolean;
    email_error?: string;
  }>
> {
  try {
    await assertAdmin();
    const admin = createAdminClient();

    // 1) Cargar profile + auth user
    const { data: profile, error: pErr } = await admin
      .from("dj_profile")
      .select("user_id, artist_name, is_admin, onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) return { ok: false, error: `dj_profile: ${pErr.message}` };
    if (!profile) return { ok: false, error: "Usuario no encontrado en dj_profile" };
    if (profile.is_admin) {
      return { ok: false, error: "No se puede borrar un usuario admin." };
    }
    if (profile.onboarding_completed_at) {
      return {
        ok: false,
        error:
          "Este usuario completó el onboarding — no es huérfano. Si quieres borrarlo igual, hazlo desde el panel de Supabase.",
      };
    }

    const {
      data: authData,
      error: aErr,
    } = await admin.auth.admin.getUserById(userId);
    if (aErr || !authData?.user?.email) {
      return {
        ok: false,
        error: `No se pudo leer email del auth.users: ${aErr?.message || "sin email"}`,
      };
    }
    const email = authData.user.email;
    const artistName = (profile.artist_name as string) || "";

    // 2) Mandar email (best-effort, no bloqueante)
    let emailSent = false;
    let emailError: string | undefined;
    if (isResendConfigured()) {
      const betaUrl = getBetaUrl();
      const sendRes = await sendEmail({
        to: email,
        subject: "Tu cuenta en DROP — falta un paso",
        html: needsBetaRequestEmailHtml({
          artistName: artistName || undefined,
          betaUrl,
        }),
        text: needsBetaRequestEmailText({
          artistName: artistName || undefined,
          betaUrl,
        }),
        replyTo: process.env.RESEND_REPLY_TO || undefined,
      });
      if (sendRes.ok) {
        emailSent = true;
      } else {
        emailError = sendRes.error;
      }
    } else {
      emailError = "Resend no configurado en este entorno";
    }

    // 3) Borrar el user de auth.users — el cascade de FKs limpia el resto
    // (dj_profile, contacts, content_posts, platform_snapshots, etc; todas
    // declaradas con `on delete cascade` desde la migration 0001).
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return {
        ok: false,
        error: `Borrado falló: ${delErr.message}${
          emailSent ? " (pero el email ya fue enviado)" : ""
        }`,
      };
    }

    revalidatePath("/admin");
    return {
      ok: true,
      data: { email, email_sent: emailSent, email_error: emailError },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
