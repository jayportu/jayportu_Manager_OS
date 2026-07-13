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
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  bookerVerificadoEmailHtml,
  bookerVerificadoEmailText,
} from "@/lib/email/templates/booker";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

export type BookerVerifyResult =
  | {
      ok: true;
      status: "verified" | "already_verified";
      user_id: string;
      verified_at: string | null;
    }
  | { ok: false; status: "not_found"; user_id: string };

/**
 * Verifica un booker con service_role (bypassa el trigger). Idempotente.
 * `via` queda en el evento de funnel para distinguir origen (n8n 1-clic vs
 * admin). En una verificación FRESCA manda el email "verificado" (best-effort).
 */
export async function verifyBookerByAdmin(
  userId: string,
  verifiedBy?: string | null,
  via: string = "n8n"
): Promise<BookerVerifyResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("booker_accounts")
    .select("user_id, verified_at, full_name, email")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) return { ok: false, status: "not_found", user_id: userId };

  const row = existing as {
    user_id: string;
    verified_at: string | null;
    full_name: string | null;
    email: string | null;
  };
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
      metadata: { via },
    });
  } catch {
    /* tracking best-effort */
  }

  // Email "verificado" (best-effort; one-shot natural: solo en verificación fresca).
  try {
    if (isResendConfigured()) {
      let email = row.email || "";
      if (!email) {
        const { data: u } = await admin.auth.admin.getUserById(userId);
        email = u?.user?.email ?? "";
      }
      if (email) {
        const bookerName = row.full_name || "";
        const gigsUrl = `${SITE}/booker/convocatorias`;
        await sendEmail({
          to: email,
          subject: "Tu cuenta de booker está verificada",
          html: bookerVerificadoEmailHtml({ bookerName, gigsUrl }),
          text: bookerVerificadoEmailText({ bookerName, gigsUrl }),
        });
      }
    }
  } catch (e) {
    console.error("[booker-verify] email verificado:", e);
  }

  return {
    ok: true,
    status: "verified",
    user_id: userId,
    verified_at: (updated as { verified_at: string }).verified_at,
  };
}
