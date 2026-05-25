import "server-only";

/**
 * Sprint 23.5 — Helpers de estado de beta (server-only).
 *
 * Calcula días desde aprobación, hito NPS pendiente, días restantes.
 * Usa zona horaria Santiago para no romperse con UTC.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { NpsMilestone } from "@/types/database";

/** Días enteros entre dos fechas (positivos si end > start). */
function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export interface BetaState {
  /** Días desde que se aprobó al user (0 = hoy mismo). null si no es beta active. */
  daysSinceApproval: number | null;
  /** Días que quedan hasta los 15 (puede ser negativo si ya pasaron). */
  daysRemaining: number | null;
  /** Hito NPS pendiente (no respondido aún) si calza el rango. */
  pendingNps: NpsMilestone | null;
}

const BETA_LENGTH_DAYS = 15;
const NPS_DAY_7 = 7;
const NPS_DAY_15 = 15;

/**
 * Calcula el estado beta de un user y si tiene NPS pendiente.
 * - day_7: visible desde día 7 al 13 (antes del day_15 prompt).
 * - day_15: visible desde día 15 en adelante (mientras no responda).
 *
 * Usa service_role para chequear si ya respondió cada hito.
 */
export async function getBetaState(opts: {
  userId: string;
  betaStatus: string | null;
  betaApprovedAt: string | null;
}): Promise<BetaState> {
  if (opts.betaStatus !== "active" || !opts.betaApprovedAt) {
    return { daysSinceApproval: null, daysRemaining: null, pendingNps: null };
  }
  const approved = new Date(opts.betaApprovedAt);
  const now = new Date();
  const days = daysBetween(approved, now);
  const remaining = BETA_LENGTH_DAYS - days;

  // Determinar hito candidato
  let candidate: NpsMilestone | null = null;
  if (days >= NPS_DAY_15) candidate = "day_15";
  else if (days >= NPS_DAY_7) candidate = "day_7";

  if (!candidate) {
    return {
      daysSinceApproval: days,
      daysRemaining: remaining,
      pendingNps: null,
    };
  }

  // Chequear si ya respondió ese hito
  const admin = createAdminClient();
  const { data } = await admin
    .from("nps_responses")
    .select("id")
    .eq("user_id", opts.userId)
    .eq("milestone", candidate)
    .maybeSingle();
  const alreadyAnswered = !!data;

  // Si day_15 ya respondió, no mostrar (no hay day_22 ni nada). Si day_7
  // ya respondió pero todavía no es día 15, también no mostrar.
  return {
    daysSinceApproval: days,
    daysRemaining: remaining,
    pendingNps: alreadyAnswered ? null : candidate,
  };
}
