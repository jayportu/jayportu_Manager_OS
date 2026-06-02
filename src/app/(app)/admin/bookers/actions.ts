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

type Result = { ok: true; verified: boolean } | { ok: false; error: string };

export async function setBookerVerifiedAction(
  bookerUserId: string,
  verified: boolean
): Promise<Result> {
  try {
    const { userId: adminId } = await assertAdmin();
    const admin = createAdminClient();

    const { error } = await admin
      .from("booker_accounts")
      .update({
        verified_at: verified ? new Date().toISOString() : null,
        verified_by: verified ? adminId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", bookerUserId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/admin/bookers");
    return { ok: true, verified };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
