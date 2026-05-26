import "server-only";

/**
 * Sprint 23.5 — Helpers de invite flow.
 *
 * El user llega a /login?invite=<token>. El middleware setea la cookie
 * HttpOnly `dropbeta_invite_token` con el token raw (Next.js NO permite
 * setear cookies desde un server component — por eso vive en el middleware).
 *
 * El server component de /login solo LEE la DB para mostrar el banner
 * "Estás dentro, hola {nombre}" — no escribe nada.
 *
 * Después de que el user completa signup/login y aterriza en (app)/layout,
 * `consumeBetaInviteIfAny` lee la cookie, valida que el email del user
 * coincida con el de la solicitud, activa beta_status='active' y limpia
 * el invite_token de la DB (one-shot).
 */

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBetaRequestByToken } from "@/lib/queries/beta";

const INVITE_COOKIE = "dropbeta_invite_token";

/**
 * Lookup read-only del invite para mostrar banner pre-fill en /login.
 * NO escribe cookies (eso lo hace el middleware). NO debería tirar.
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
  return { email: req.email, artist_name: req.artist_name };
}

/**
 * Consume la cookie del invite si existe y el user actual matches.
 * Activa beta_status='active', limpia invite_token, asocia user_id.
 * Idempotente: si no hay cookie, no hace nada.
 *
 * Llamado desde el layout (app) en cada request — el cost es 1 select
 * a beta_requests (indexado por invite_token) cuando hay cookie, cero
 * queries cuando no hay.
 *
 * Nota: cookies().delete() acá funciona porque el layout se ejecuta
 * después del flujo de auth y Next.js lo permite en ese contexto (el
 * response stream aún no se commiteó). Si en el futuro Next.js endurece
 * esto, mover el delete al middleware también.
 */
export async function consumeBetaInviteIfAny(opts: {
  userId: string;
  userEmail: string | null;
}): Promise<{ activated: true } | { activated: false }> {
  const c = await cookies();
  const token = c.get(INVITE_COOKIE)?.value;
  if (!token) return { activated: false };

  const admin = createAdminClient();
  const { data } = await admin
    .from("beta_requests")
    .select("id, email, status, invite_token, user_id")
    .eq("invite_token", token)
    .maybeSingle();

  // Limpiar cookie sí o sí (one-shot intent — incluso si falla la activación,
  // no queremos que se reintente en cada request). Si Next.js tira porque el
  // contexto no permite delete, hacemos best-effort y seguimos.
  try {
    c.delete(INVITE_COOKIE);
  } catch {
    // noop — el cookie expira en 30min de todos modos
  }

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
