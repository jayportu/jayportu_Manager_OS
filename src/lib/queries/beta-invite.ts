import "server-only";

/**
 * Sprint 23.5 — Helpers de invite flow.
 *
 * El user llega a /login?invite=<token>. Validamos el token, seteamos
 * una cookie HttpOnly con el request_id. Después de que el user hace
 * signup/login, consumeBetaInvite() lee la cookie, activa el beta y
 * limpia el invite_token (one-shot).
 */

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBetaRequestByToken } from "@/lib/queries/beta";

const INVITE_COOKIE = "dropbeta_invite";
const INVITE_TTL_SECONDS = 60 * 30; // 30 minutos

/**
 * Lee el token de query, valida contra DB, setea cookie. Devuelve
 * datos para pre-fill del form de signup. Llamado desde /login server.
 */
export async function startBetaInviteFlow(
  token: string
): Promise<{ email: string; artist_name: string } | null> {
  const req = await findBetaRequestByToken(token);
  if (!req) return null;
  if (req.status !== "approved") return null;
  if (!req.invite_token) return null;
  // Si ya fue consumido (user_id ya seteado), no permitir reuso
  if (req.user_id) return null;

  const c = await cookies();
  c.set(INVITE_COOKIE, req.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: INVITE_TTL_SECONDS,
    path: "/",
  });
  return { email: req.email, artist_name: req.artist_name };
}

/**
 * Consume la cookie del invite si existe y el user actual matches.
 * Activa beta_status='active', limpia invite_token, asocia user_id.
 * Idempotente: si no hay cookie, no hace nada.
 *
 * Llamado desde el layout (app) en cada request — el cost es 1 select
 * a beta_requests (indexado por id) cuando hay cookie, cero queries
 * cuando no hay.
 */
export async function consumeBetaInviteIfAny(opts: {
  userId: string;
  userEmail: string | null;
}): Promise<{ activated: true } | { activated: false }> {
  const c = await cookies();
  const requestId = c.get(INVITE_COOKIE)?.value;
  if (!requestId) return { activated: false };

  const admin = createAdminClient();
  const { data } = await admin
    .from("beta_requests")
    .select("id, email, status, invite_token, user_id")
    .eq("id", requestId)
    .maybeSingle();

  // Limpiar cookie sí o sí (one-shot intent — incluso si falla la activación,
  // no queremos que se reintente en cada request)
  c.delete(INVITE_COOKIE);

  if (!data) return { activated: false };
  const r = data as {
    id: string;
    email: string;
    status: string;
    invite_token: string | null;
    user_id: string | null;
  };

  // Validaciones de seguridad:
  if (r.status !== "approved") return { activated: false };
  if (r.user_id) return { activated: false }; // ya consumido por otro
  if (!opts.userEmail) return { activated: false };
  // El email del usuario logueado debe coincidir con el email de la
  // solicitud — previene que alguien reuse un invite con otra cuenta.
  if (opts.userEmail.toLowerCase() !== r.email.toLowerCase()) {
    return { activated: false };
  }

  // Activar beta en dj_profile (upsert por si aún no existe el row)
  const nowIso = new Date().toISOString();
  await admin
    .from("dj_profile")
    .upsert(
      {
        user_id: opts.userId,
        beta_status: "active",
        beta_approved_at: nowIso,
        beta_request_id: r.id,
      },
      { onConflict: "user_id" }
    );

  // Asociar user_id en beta_requests + limpiar invite_token (one-shot)
  await admin
    .from("beta_requests")
    .update({
      user_id: opts.userId,
      invite_token: null, // invalidar para que no se reuse
    })
    .eq("id", r.id);

  return { activated: true };
}
