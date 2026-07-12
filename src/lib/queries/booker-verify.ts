import "server-only";

/**
 * F1/n8n — Verificación de bookers vía automatización.
 *
 * Corre con service_role (createAdminClient) → bypassa el trigger BEFORE UPDATE
 * de booker_accounts (0032/0044/0063), que es exactamente cómo debe hacerse la
 * verificación (privilegiada). Idempotente. La invoca el endpoint
 * /api/admin/booker-verify que llama n8n tras aprobar en su cola de triage.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type BookerVerifyResult =
  | {
      ok: true;
      status: "verified" | "already_verified";
      user_id: string;
      verified_at: string | null;
    }
  | { ok: false; status: "not_found"; user_id: string };

export async function verifyBookerByAdmin(
  userId: string,
  verifiedBy?: string | null
): Promise<BookerVerifyResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("booker_accounts")
    .select("user_id, verified_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) return { ok: false, status: "not_found", user_id: userId };

  const row = existing as { user_id: string; verified_at: string | null };
  if (row.verified_at) {
    return {
      ok: true,
      status: "already_verified",
      user_id: userId,
      verified_at: row.verified_at,
    };
  }

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("booker_accounts")
    .update({ verified_at: now, verified_by: verifiedBy ?? null, updated_at: now })
    .eq("user_id", userId)
    .select("verified_at")
    .single();
  if (error) throw new Error(error.message);

  // Evento de funnel (best-effort) — atribuido al booker.
  try {
    await admin.from("usage_events").insert({
      user_id: userId,
      event: "booker_verified",
      page: "/api/admin/booker-verify",
      metadata: { via: "n8n" },
    });
  } catch {
    /* tracking best-effort */
  }

  return {
    ok: true,
    status: "verified",
    user_id: userId,
    verified_at: (updated as { verified_at: string }).verified_at,
  };
}
