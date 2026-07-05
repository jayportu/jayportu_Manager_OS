"use server";

/**
 * Sprint S20 — Server actions del backoffice general (no las de
 * beta-requests/beta-reminder/feedback que tienen su propio archivo).
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  needsBetaRequestEmailHtml,
  needsBetaRequestEmailText,
} from "@/lib/email/templates";
import type { AccountStatus } from "@/types/database";
import { logSecurityEvent } from "@/lib/security-audit";
import { maskEmail } from "@/lib/log-safe";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Fase 1 · 1A — Verificación manual de DJs desde el backoffice (estilo RA).
 * Solo admin. El UPDATE va con service_role (createAdminClient); el trigger
 * protect_dj_verification() (migration 0038) impide que un DJ se auto-verifique
 * vía su propio update de perfil.
 */
export async function setDjVerifiedAction(
  djUserId: string,
  verified: boolean
): Promise<{ ok: true; verified: boolean } | { ok: false; error: string }> {
  try {
    const { userId: adminId } = await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("dj_profile")
      .update({
        verified_at: verified ? new Date().toISOString() : null,
        verified_by: verified ? adminId : null,
      })
      .eq("user_id", djUserId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    revalidatePath("/dj");
    revalidatePath("/p/[slug]", "page");
    revalidateTag("public-djs");
    await logSecurityEvent({
      action: "admin.dj_verified",
      actorUserId: adminId,
      targetType: "dj_profile",
      targetId: djUserId,
      metadata: { verified },
    });
    return { ok: true, verified };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Fase 1 · 1F — Otorga/quita un chequeo de confiabilidad granular
 * ('identity' | 'socials' | 'sets'). Mismo blindaje que 1A (service_role +
 * trigger protect_dj_verification). El chequeo 'history' NO va acá: es
 * automático (se calcula de los gigs).
 */
export async function setDjVerificationAction(
  djUserId: string,
  key: "identity" | "socials" | "sets",
  on: boolean
): Promise<
  { ok: true; verifications: string[] } | { ok: false; error: string }
> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { data: prof, error: readErr } = await admin
      .from("dj_profile")
      .select("verifications")
      .eq("user_id", djUserId)
      .maybeSingle();
    if (readErr) return { ok: false, error: readErr.message };
    const current: string[] = (prof?.verifications as string[] | null) ?? [];
    const next = on
      ? Array.from(new Set([...current, key]))
      : current.filter((k) => k !== key);
    const { error } = await admin
      .from("dj_profile")
      .update({ verifications: next })
      .eq("user_id", djUserId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    revalidatePath("/dj");
    revalidatePath("/p/[slug]", "page");
    revalidateTag("public-djs");
    return { ok: true, verifications: next };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Fase 1 · RA-2A — Marca/desmarca un DJ como DROP Pick (destacado en /dj).
 * Solo admin (service_role); protegido por el trigger protect_dj_verification.
 */
export async function setDjDropPickAction(
  djUserId: string,
  on: boolean
): Promise<{ ok: true; isPick: boolean } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    const admin = createAdminClient();
    const { error } = await admin
      .from("dj_profile")
      .update({ is_drop_pick: on })
      .eq("user_id", djUserId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/admin");
    revalidatePath("/dj");
    revalidatePath("/p/[slug]", "page");
    revalidateTag("public-djs");
    return { ok: true, isPick: on };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

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
    const { userId: adminId } = await assertAdmin();
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

    await logSecurityEvent({
      action: "admin.user_deleted",
      actorUserId: adminId,
      targetType: "auth.users",
      targetId: userId,
      metadata: { mode: "orphan_cleanup", email: maskEmail(email) },
    });

    revalidatePath("/admin");
    return {
      ok: true,
      data: { email, email_sent: emailSent, email_error: emailError },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Migration 0030 — Cambiar el estado de moderación de una cuenta.
 *
 * Permite a un admin (Jaime / Fer) suspender (temporal), banear
 * (permanente) o reactivar a un usuario. El gating de acceso lo aplica
 * (app)/layout.tsx: un user 'suspended'|'banned' es redirigido a
 * /cuenta-suspendida.
 *
 * El UPDATE va con service_role (createAdminClient) — el trigger DB
 * protect_account_status() bloquea cambios de estado desde cualquier
 * otro rol, así un user no puede auto-reactivarse.
 *
 * Salvaguardas:
 *   - No puedes cambiar tu propio estado (evita auto-ban accidental).
 *   - No puedes suspender/banear a otro admin.
 *   - Reason obligatorio para suspender/banear (queda en el audit trail).
 */
export async function setAccountStatusAction(
  userId: string,
  status: AccountStatus,
  reason: string
): Promise<Result<{ status: AccountStatus }>> {
  try {
    const { userId: adminId } = await assertAdmin();

    if (userId === adminId) {
      return { ok: false, error: "No puedes cambiar tu propio estado de cuenta." };
    }
    if (!["active", "suspended", "banned"].includes(status)) {
      return { ok: false, error: "Estado inválido." };
    }
    const cleanReason = reason.trim().slice(0, 500);
    if ((status === "suspended" || status === "banned") && cleanReason.length === 0) {
      return {
        ok: false,
        error: "Tienes que indicar un motivo para suspender o banear.",
      };
    }

    const admin = createAdminClient();

    // Cargar el target para validar que existe y no es admin
    const { data: target, error: tErr } = await admin
      .from("dj_profile")
      .select("user_id, is_admin, artist_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (tErr) return { ok: false, error: `dj_profile: ${tErr.message}` };
    if (!target) return { ok: false, error: "Usuario no encontrado." };
    if (target.is_admin) {
      return { ok: false, error: "No puedes suspender ni banear a un admin." };
    }

    const { error: upErr } = await admin
      .from("dj_profile")
      .update({
        account_status: status,
        account_status_reason: status === "active" ? null : cleanReason,
        account_status_changed_at: new Date().toISOString(),
        account_status_changed_by: adminId,
      })
      .eq("user_id", userId);
    if (upErr) return { ok: false, error: `Update falló: ${upErr.message}` };

    // Audit trail best-effort en usage_events (bajo el user_id del admin)
    await admin.from("usage_events").insert({
      user_id: adminId,
      event:
        status === "active"
          ? "admin_account_reactivated"
          : status === "suspended"
            ? "admin_account_suspended"
            : "admin_account_banned",
      page: "/admin",
      metadata: { target_user_id: userId, reason: cleanReason || null },
    });

    await logSecurityEvent({
      action: "admin.account_status_changed",
      actorUserId: adminId,
      targetType: "dj_profile",
      targetId: userId,
      metadata: { status, reason: cleanReason || null },
    });

    revalidatePath("/admin");
    return { ok: true, data: { status } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Migration 0063 — suspender / banear / reactivar un BOOKER. Espejo de
 * setAccountStatusAction pero sobre booker_accounts. El trigger
 * protect_booker_account_status() bloquea cambios desde cualquier rol que no
 * sea service_role, así un booker no puede auto-reactivarse.
 */
export async function setBookerAccountStatusAction(
  bookerUserId: string,
  status: AccountStatus,
  reason: string
): Promise<Result<{ status: AccountStatus }>> {
  try {
    const { userId: adminId } = await assertAdmin();

    if (bookerUserId === adminId) {
      return { ok: false, error: "No puedes cambiar tu propio estado de cuenta." };
    }
    if (!["active", "suspended", "banned"].includes(status)) {
      return { ok: false, error: "Estado inválido." };
    }
    const cleanReason = reason.trim().slice(0, 500);
    if ((status === "suspended" || status === "banned") && cleanReason.length === 0) {
      return {
        ok: false,
        error: "Tienes que indicar un motivo para suspender o banear.",
      };
    }

    const admin = createAdminClient();

    const { data: target, error: tErr } = await admin
      .from("booker_accounts")
      .select("user_id, full_name")
      .eq("user_id", bookerUserId)
      .maybeSingle();
    if (tErr) return { ok: false, error: `booker_accounts: ${tErr.message}` };
    if (!target) return { ok: false, error: "Booker no encontrado." };

    const { error: upErr } = await admin
      .from("booker_accounts")
      .update({
        account_status: status,
        account_status_reason: status === "active" ? null : cleanReason,
        account_status_changed_at: new Date().toISOString(),
        account_status_changed_by: adminId,
      })
      .eq("user_id", bookerUserId);
    if (upErr) return { ok: false, error: `Update falló: ${upErr.message}` };

    await admin.from("usage_events").insert({
      user_id: adminId,
      event:
        status === "active"
          ? "admin_account_reactivated"
          : status === "suspended"
            ? "admin_account_suspended"
            : "admin_account_banned",
      page: "/admin/bookers",
      metadata: { target_user_id: bookerUserId, role: "booker", reason: cleanReason || null },
    });

    await logSecurityEvent({
      action: "admin.booker_account_status_changed",
      actorUserId: adminId,
      targetType: "booker_accounts",
      targetId: bookerUserId,
      metadata: { status, reason: cleanReason || null },
    });

    revalidatePath("/admin/bookers");
    return { ok: true, data: { status } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Elimina una cuenta de forma PERMANENTE (ej. una cuenta de prueba o spam).
 * Borra el user de auth.users → el cascade de FKs limpia todo su contenido
 * (dj_profile, contacts, bookings, favoritos, etc.). A diferencia de
 * notifyAndDeleteUserAction, sirve también para cuentas con onboarding.
 *
 * Salvaguardas: no puedes eliminarte a ti mismo ni a otro admin. La UI exige
 * escribir "ELIMINAR" antes de llamar (ConfirmDialog typeToConfirm).
 */
export async function deleteUserAction(
  userId: string
): Promise<Result<{ deleted: true }>> {
  try {
    const { userId: adminId } = await assertAdmin();
    if (userId === adminId) {
      return { ok: false, error: "No puedes eliminar tu propia cuenta." };
    }

    const admin = createAdminClient();
    const { data: target, error: tErr } = await admin
      .from("dj_profile")
      .select("user_id, is_admin, artist_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (tErr) return { ok: false, error: `dj_profile: ${tErr.message}` };
    if (target?.is_admin) {
      return { ok: false, error: "No puedes eliminar a un admin." };
    }

    // Audit ANTES del borrado (bajo el user_id del admin, que persiste).
    await admin.from("usage_events").insert({
      user_id: adminId,
      event: "admin_account_deleted",
      page: "/admin",
      metadata: {
        target_user_id: userId,
        artist_name: (target?.artist_name as string) || null,
      },
    });

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return { ok: false, error: `Borrado falló: ${delErr.message}` };

    await logSecurityEvent({
      action: "admin.user_deleted",
      actorUserId: adminId,
      targetType: "auth.users",
      targetId: userId,
      metadata: {
        mode: "permanent",
        artist_name: (target?.artist_name as string) || null,
      },
    });

    revalidatePath("/admin");
    return { ok: true, data: { deleted: true } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
