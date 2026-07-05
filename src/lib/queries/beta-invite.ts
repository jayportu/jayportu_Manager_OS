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
 *
 * FALLBACK por email (importante): si la cookie no llegó (Safari ITP, mobile
 * cross-device, incógnito, cookie expirada), buscamos beta_requests por
 * email = user.email AND status='approved' AND user_id IS NULL. Esto blinda
 * el caso "confirmé el email en otro dispositivo" — sin esto el user queda
 * logueado pero sin beta_status='active' y el lockout post-15d lo bloquea
 * aunque nunca haya usado la beta.
 */

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { findBetaRequestByToken } from "@/lib/queries/beta";
import { maskEmail } from "@/lib/log-safe";

const INVITE_COOKIE = "dropbeta_invite_token";

interface BetaRequestRow {
  id: string;
  email: string;
  status: string;
  invite_token: string | null;
  user_id: string | null;
}

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
 * Idempotente: si no hay cookie, hace fallback por email.
 *
 * Logs verbose en cada return path para diagnosticar después por qué un
 * user quedó (o no) activado — sin esto no había forma de auditar.
 */
export async function consumeBetaInviteIfAny(opts: {
  userId: string;
  userEmail: string | null;
}): Promise<
  | { activated: true; via: "cookie" | "email_fallback" }
  | { activated: false; reason: string }
> {
  const userIdShort = opts.userId.slice(0, 8);
  const admin = createAdminClient();
  const c = await cookies();
  const token = c.get(INVITE_COOKIE)?.value;

  // ─────────────────────────────────────────────────────────────────
  // Path 1: cookie presente → buscar por invite_token
  // ─────────────────────────────────────────────────────────────────
  let row: BetaRequestRow | null = null;
  let via: "cookie" | "email_fallback" = "cookie";

  if (token) {
    const { data, error } = await admin
      .from("beta_requests")
      .select("id, email, status, invite_token, user_id")
      .eq("invite_token", token)
      .maybeSingle();

    if (error) {
      console.error("[beta-invite] DB error buscando por token", {
        userId: userIdShort,
        err: error.message,
      });
    }
    row = (data as BetaRequestRow | null) ?? null;

    // Limpiar cookie sí o sí (one-shot intent). Si el delete tira porque
    // el contexto no lo permite (RSC streaming), seguimos — la cookie
    // expira sola eventualmente.
    try {
      c.delete(INVITE_COOKIE);
    } catch {
      // noop
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Path 2 (FALLBACK): no había cookie o no matcheó → buscar por email
  // ─────────────────────────────────────────────────────────────────
  if (!row && opts.userEmail) {
    const { data, error } = await admin
      .from("beta_requests")
      .select("id, email, status, invite_token, user_id")
      .eq("email", opts.userEmail.toLowerCase())
      .eq("status", "approved")
      .is("user_id", null)
      .maybeSingle();

    if (error) {
      console.error("[beta-invite] DB error fallback por email", {
        userId: userIdShort,
        err: error.message,
      });
    }
    if (data) {
      row = data as BetaRequestRow;
      via = "email_fallback";
      console.log("[beta-invite] activando via fallback por email", {
        userId: userIdShort,
        email: maskEmail(opts.userEmail),
      });
    }
  }

  if (!row) {
    console.log("[beta-invite] sin invite que consumir", {
      userId: userIdShort,
      hadCookie: !!token,
      hasEmail: !!opts.userEmail,
    });
    return { activated: false, reason: "no_invite_found" };
  }

  // ─────────────────────────────────────────────────────────────────
  // Validaciones de seguridad
  // ─────────────────────────────────────────────────────────────────
  if (row.status !== "approved") {
    console.log("[beta-invite] invite no aprobado", {
      userId: userIdShort,
      status: row.status,
      via,
    });
    return { activated: false, reason: "not_approved" };
  }
  if (row.user_id && row.user_id !== opts.userId) {
    console.log("[beta-invite] invite ya consumido por otro user", {
      userId: userIdShort,
      via,
    });
    return { activated: false, reason: "already_consumed" };
  }
  if (!opts.userEmail) {
    console.log("[beta-invite] user sin email", { userId: userIdShort });
    return { activated: false, reason: "no_user_email" };
  }
  if (opts.userEmail.toLowerCase() !== row.email.toLowerCase()) {
    console.warn("[beta-invite] email mismatch (posible reuso de invite)", {
      userId: userIdShort,
      userEmail: maskEmail(opts.userEmail),
      inviteEmail: maskEmail(row.email),
      via,
    });
    return { activated: false, reason: "email_mismatch" };
  }

  // ─────────────────────────────────────────────────────────────────
  // Activar beta_status + limpiar invite_token (transacción lógica)
  // ─────────────────────────────────────────────────────────────────
  const nowIso = new Date().toISOString();
  const { error: upsertErr } = await admin
    .from("dj_profile")
    .upsert(
      {
        user_id: opts.userId,
        beta_status: "active",
        beta_approved_at: nowIso,
        beta_request_id: row.id,
      },
      { onConflict: "user_id" }
    );

  if (upsertErr) {
    console.error("[beta-invite] upsert dj_profile FALLÓ", {
      userId: userIdShort,
      err: upsertErr.message,
      via,
    });
    return { activated: false, reason: "profile_upsert_failed" };
  }

  const { error: updateErr } = await admin
    .from("beta_requests")
    .update({
      user_id: opts.userId,
      invite_token: null, // invalidar para que no se reuse
    })
    .eq("id", row.id);

  if (updateErr) {
    // Profile YA quedó activado, pero no pudimos limpiar invite_token.
    // No es crítico (el user ya está active); solo logueamos.
    console.error("[beta-invite] update beta_requests falló pero profile OK", {
      userId: userIdShort,
      err: updateErr.message,
      via,
    });
  }

  console.log("[beta-invite] ACTIVATED OK", {
    userId: userIdShort,
    email: opts.userEmail,
    via,
  });
  return { activated: true, via };
}
