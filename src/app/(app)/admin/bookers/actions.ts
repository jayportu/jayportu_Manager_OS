"use server";

/**
 * Fase 1 booker — Verificación manual de bookers desde el backoffice.
 *
 * Solo admin. El UPDATE va con service_role (createAdminClient) — el
 * trigger DB protect_booker_verification() bloquea cambios de verified_*
 * desde cualquier otro rol, así un booker no puede auto-verificarse.
 */

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyBookerByAdmin } from "@/lib/queries/booker-verify";

type Result = { ok: true; verified: boolean } | { ok: false; error: string };

export async function setBookerVerifiedAction(
  bookerUserId: string,
  verified: boolean
): Promise<Result> {
  try {
    const { userId: adminId } = await assertAdmin();

    if (verified) {
      // Verificar: pasa por verifyBookerByAdmin (idempotente, emite evento de
      // funnel + manda el email "verificado" en la verificación fresca). Mismo
      // camino que el 1-clic de n8n, para que ambos flujos queden consistentes.
      const res = await verifyBookerByAdmin(bookerUserId, adminId, "admin");
      if (!res.ok) return { ok: false, error: "Booker no encontrado" };
    } else {
      // Quitar verificación: update directo con service_role (bypassa trigger).
      const admin = createAdminClient();
      const now = new Date().toISOString();
      const { error } = await admin
        .from("booker_accounts")
        .update({ verified_at: null, verified_by: null, updated_at: now })
        .eq("user_id", bookerUserId);
      if (error) return { ok: false, error: error.message };
    }

    revalidatePath("/admin/bookers");
    return { ok: true, verified };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
