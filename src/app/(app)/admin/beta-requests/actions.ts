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
import type { BetaRequestStatus } from "@/types/database";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function approveBetaRequestAction(
  id: string
): Promise<Result<{ invite_token: string; email: string; artist_name: string }>> {
  try {
    await assertAdmin();
    const updated = await updateBetaRequestStatus(id, "approved");
    if (!updated.invite_token) {
      return { ok: false, error: "Token no se generó" };
    }
    revalidatePath("/admin/beta-requests");
    return {
      ok: true,
      data: {
        invite_token: updated.invite_token,
        email: updated.email,
        artist_name: updated.artist_name,
      },
    };
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
    await updateBetaRequestStatus(id, "rejected", reason);
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
