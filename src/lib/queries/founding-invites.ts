/**
 * Founding Bookers (Fase 2) — invitaciones VIP con token de un solo uso.
 *
 * Mirror de la infra de beta de DJs (beta.ts + beta-invite.ts), adaptada al
 * lado booker. El admin invita por email → token único → al registrarse (o en
 * su próxima visita a /booker) `consumeFoundingInviteIfAny` auto-marca
 * is_founding + verifica e invalida el token (single-use).
 *
 * Todo con service_role (createAdminClient): el trigger
 * protect_booker_verification bloquea is_founding/verified_* desde otros roles.
 */
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cookie HttpOnly donde el middleware guarda el token del link de invite. */
export const FOUNDING_COOKIE = "dropfounding_invite_token";

export interface FoundingInvite {
  id: string;
  email: string;
  full_name: string;
  invite_token: string | null;
  status: "pending" | "accepted" | "revoked";
  invite_sent_at: string | null;
  accepted_at: string | null;
  accepted_user_id: string | null;
  invited_by: string | null;
  created_at: string;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ─── Admin ──────────────────────────────────────────────────────────────

/**
 * Crea (o refresca) una invitación Founding para un email. Si ya hay una
 * pendiente para ese email, le regenera el token y actualiza el nombre.
 */
export async function createFoundingInvite(input: {
  email: string;
  fullName: string;
  invitedBy: string;
}): Promise<
  { ok: true; id: string; token: string; email: string; fullName: string }
  | { ok: false; error: string }
> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim().slice(0, 80);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Email inválido" };

  const admin = createAdminClient();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();

  // ¿Ya hay una invitación pendiente para este email? → refrescarla.
  const { data: existing } = await admin
    .from("founding_invites")
    .select("id")
    .eq("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    const { error } = await admin
      .from("founding_invites")
      .update({
        invite_token: token,
        full_name: fullName,
        invited_by: input.invitedBy,
        invite_sent_at: null,
        updated_at: now,
      })
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: existing.id, token, email, fullName };
  }

  const { data, error } = await admin
    .from("founding_invites")
    .insert({
      email,
      full_name: fullName,
      invite_token: token,
      status: "pending",
      invited_by: input.invitedBy,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id as string, token, email, fullName };
}

export async function listFoundingInvites(): Promise<FoundingInvite[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("founding_invites")
    .select(
      "id, email, full_name, invite_token, status, invite_sent_at, accepted_at, accepted_user_id, invited_by, created_at"
    )
    .order("created_at", { ascending: false });
  return (data ?? []) as FoundingInvite[];
}

export async function markFoundingInviteSent(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("founding_invites")
    .update({ invite_sent_at: new Date().toISOString() })
    .eq("id", id);
}

export async function revokeFoundingInvite(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("founding_invites")
    .update({ status: "revoked", invite_token: null, updated_at: new Date().toISOString() })
    .eq("id", id);
}

// ─── Consumo (single-use) ─────────────────────────────────────────────────

interface InviteRow {
  id: string;
  email: string;
  status: string;
  invite_token: string | null;
  accepted_user_id: string | null;
  invited_by: string | null;
}

/**
 * Consume la invitación Founding del booker logueado si existe y matchea.
 * Marca is_founding + verifica e invalida el token. Idempotente: si no hay
 * cookie, hace fallback por email; si ya se consumió, no encuentra nada.
 *
 * Se llama desde /booker/layout DESPUÉS de ensureBookerAccount (el row debe
 * existir para el UPDATE).
 */
export async function consumeFoundingInviteIfAny(opts: {
  userId: string;
  userEmail: string | null;
}): Promise<
  | { activated: true; via: "cookie" | "email_fallback" }
  | { activated: false; reason: string }
> {
  const admin = createAdminClient();
  const c = await cookies();
  const token = c.get(FOUNDING_COOKIE)?.value;

  let row: InviteRow | null = null;
  let via: "cookie" | "email_fallback" = "cookie";

  // Path 1: token desde la cookie del link
  if (token) {
    const { data } = await admin
      .from("founding_invites")
      .select("id, email, status, invite_token, accepted_user_id, invited_by")
      .eq("invite_token", token)
      .maybeSingle();
    row = (data as InviteRow | null) ?? null;
    try {
      c.delete(FOUNDING_COOKIE);
    } catch {
      // RSC streaming puede no permitir delete; la cookie expira sola.
    }
  }

  // Path 2 (fallback): por email (Safari ITP / otro dispositivo / sin cookie)
  if (!row && opts.userEmail) {
    const { data } = await admin
      .from("founding_invites")
      .select("id, email, status, invite_token, accepted_user_id, invited_by")
      .eq("email", opts.userEmail.toLowerCase())
      .eq("status", "pending")
      .maybeSingle();
    if (data) {
      row = data as InviteRow;
      via = "email_fallback";
    }
  }

  if (!row) return { activated: false, reason: "no_invite_found" };
  if (row.status !== "pending") {
    return { activated: false, reason: `status_${row.status}` };
  }
  if (!opts.userEmail) return { activated: false, reason: "no_user_email" };
  if (opts.userEmail.toLowerCase() !== row.email.toLowerCase()) {
    console.warn("[founding-invite] email mismatch (posible reuso)", {
      userId: opts.userId.slice(0, 8),
      via,
    });
    return { activated: false, reason: "email_mismatch" };
  }

  const nowIso = new Date().toISOString();

  // Auto-marcar Founding + verificar (service_role → trigger lo permite)
  const { error: updErr } = await admin
    .from("booker_accounts")
    .update({
      is_founding: true,
      founding_since: nowIso,
      verified_at: nowIso,
      verified_by: row.invited_by,
      updated_at: nowIso,
    })
    .eq("user_id", opts.userId);
  if (updErr) {
    console.error("[founding-invite] update booker_accounts falló", {
      userId: opts.userId.slice(0, 8),
      err: updErr.message,
    });
    return { activated: false, reason: "account_update_failed" };
  }

  // Invalidar el invite (single-use)
  await admin
    .from("founding_invites")
    .update({
      status: "accepted",
      invite_token: null,
      accepted_at: nowIso,
      accepted_user_id: opts.userId,
      updated_at: nowIso,
    })
    .eq("id", row.id);

  console.log("[founding-invite] ACTIVATED", {
    userId: opts.userId.slice(0, 8),
    via,
  });
  return { activated: true, via };
}
