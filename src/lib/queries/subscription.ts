/**
 * Sprint S19 — Queries y lógica de suscripción.
 *
 * Sistema PARALELO al de beta — convive con dj_profile.beta_status:
 *   - beta_status='active' o 'expired' → sigue el flow beta clásico,
 *     este módulo NO crea row en subscriptions para ese user.
 *   - beta_status='none' (default de users nuevos post-launch) → este
 *     módulo se hace cargo: crea trial 15d, evalúa expiración, devuelve
 *     estado de acceso.
 *
 * Inserts/updates van con service_role (createAdminClient) porque la
 * tabla solo tiene policy de SELECT-own (el user no puede crear su
 * propia subscription, lo hace el server por él).
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BetaStatus,
  Subscription,
  SubscriptionStatus,
} from "@/types/database";

export const TRIAL_DAYS = 15;
export const PAST_DUE_GRACE_DAYS = 7;

/** Estados de beta que mantienen el flow viejo y NO deben tener
 *  subscription row. */
const BETA_LEGACY_STATUSES: BetaStatus[] = ["active", "expired"];

export function isLegacyBetaUser(betaStatus: BetaStatus | null | undefined): boolean {
  if (!betaStatus) return false;
  return BETA_LEGACY_STATUSES.includes(betaStatus);
}

/**
 * Asegura que el user tenga una row en subscriptions. Si no existe,
 * la crea con status='trial' por 15 días. Si existe, la devuelve tal cual.
 *
 * Idempotente: race-safe gracias al unique index on user_id.
 *
 * NUNCA llamar para users con beta_status='active' o 'expired' —
 * ese gating debe hacerlo el caller.
 */
export async function getOrCreateSubscription(
  userId: string
): Promise<Subscription> {
  const admin = createAdminClient();

  // 1) Try read
  const { data: existing, error: readErr } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) throw new Error(`getSubscription read: ${readErr.message}`);
  if (existing) return existing as Subscription;

  // 2) Create with trial
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);

  const { data: created, error: insErr } = await admin
    .from("subscriptions")
    .insert({
      user_id: userId,
      status: "trial",
      payment_mode: "auto",
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      amount_clp: 10_000,
    })
    .select("*")
    .single();

  // Si otro request paralelo creó la row entre nuestro read y nuestro
  // insert, el unique constraint dispara. En ese caso re-leemos.
  if (insErr) {
    if (insErr.code === "23505") {
      const { data: retried } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (retried) return retried as Subscription;
    }
    throw new Error(`createSubscription: ${insErr.message}`);
  }
  return created as Subscription;
}

// ─── Evaluación de acceso ───────────────────────────────────────────

export type AccessReason =
  | "trial"
  | "active"
  | "cancelled_grace"
  | "trial_expired"
  | "subscription_expired"
  | "past_due";

export interface SubscriptionAccess {
  /** Si el user puede entrar a la app. Si false → modal paywall. */
  hasAccess: boolean;
  /** Por qué tiene/no tiene acceso (lo usamos en UI y telemetría). */
  reason: AccessReason;
  /** Días que le quedan al período actual (trial o paid). Null si no aplica. */
  daysRemaining: number | null;
  /** La row tal cual está en DB. */
  subscription: Subscription;
}

/**
 * Decide si una subscription da acceso o no, y cuántos días quedan.
 * Pura, sin side effects. La llama el (app)/layout.tsx para gatear.
 */
export function evaluateSubscriptionAccess(
  sub: Subscription
): SubscriptionAccess {
  const now = new Date();

  // Active o pending (esperando confirmación) → acceso
  if (sub.status === "active" || sub.status === "pending") {
    return {
      hasAccess: true,
      reason: "active",
      daysRemaining: sub.current_period_end
        ? daysUntil(sub.current_period_end, now)
        : null,
      subscription: sub,
    };
  }

  // Trial — puede estar dentro o expirado
  if (sub.status === "trial") {
    if (!sub.trial_ends_at) {
      return makeDenied(sub, "trial_expired");
    }
    const trialEnd = new Date(sub.trial_ends_at);
    if (trialEnd <= now) return makeDenied(sub, "trial_expired");
    return {
      hasAccess: true,
      reason: "trial",
      daysRemaining: daysUntil(sub.trial_ends_at, now),
      subscription: sub,
    };
  }

  // Cancelled — mantiene acceso hasta current_period_end
  if (sub.status === "cancelled") {
    if (!sub.current_period_end) {
      return makeDenied(sub, "subscription_expired");
    }
    const periodEnd = new Date(sub.current_period_end);
    if (periodEnd <= now) return makeDenied(sub, "subscription_expired");
    return {
      hasAccess: true,
      reason: "cancelled_grace",
      daysRemaining: daysUntil(sub.current_period_end, now),
      subscription: sub,
    };
  }

  // past_due — gracia corta antes del lockout (TBD si lo damos o no).
  // Por simplicidad de v1: past_due → sin acceso (paywall).
  if (sub.status === "past_due") {
    return makeDenied(sub, "past_due");
  }

  // expired y cualquier otra cosa → sin acceso
  return makeDenied(sub, "subscription_expired");
}

function makeDenied(
  sub: Subscription,
  reason: AccessReason
): SubscriptionAccess {
  return { hasAccess: false, reason, daysRemaining: 0, subscription: sub };
}

function daysUntil(iso: string, from: Date): number {
  const target = new Date(iso).getTime();
  const ms = target - from.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

// ─── Helpers ─────────────────────────────────────────────────────────

export function isPayingStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "pending";
}
