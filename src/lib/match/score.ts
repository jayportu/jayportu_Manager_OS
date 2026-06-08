/**
 * Smart Match v1 — scoring estructurado (sin LLM). Ranquea DJs del directorio
 * contra la necesidad de un evento. Función PURA y determinista: cero costo,
 * cero infra, explicable. Score 0–100 = Relevancia (90) + Calidad (10).
 */
import type { PublicDjProfile } from "@/lib/queries/directory";

export interface GigNeed {
  eventType?: string;
  city?: string;
  /** YYYY-MM-DD */
  eventDate?: string;
  /** CLP */
  budget?: number;
  /** Géneros buscados (cualquier casing; se normaliza acá). */
  genres: string[];
}

export interface MatchReason {
  label: string;
  /** true = ✓ a favor (verde); false = nota informativa / atenuada. */
  positive: boolean;
}

export interface ScoredDj {
  dj: PublicDjProfile;
  /** 0–100. */
  score: number;
  reasons: MatchReason[];
}

const norm = (s: string) => s.trim().toLowerCase();

/** Estado de disponibilidad del DJ para una fecha puntual. */
function availabilityFor(
  from: string | null,
  until: string | null,
  date?: string
): "in" | "out" | "unknown" {
  if (!from) return "unknown"; // el DJ no seteó disponibilidad
  if (!date) return "unknown";
  if (date < from) return "out";
  if (until && date > until) return "out";
  return "in";
}

/** "2026-06-12" → "12 jun" (mediodía para evitar corrimiento de tz). */
function fmtDate(date: string): string {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return date;
  }
}

/** Puntúa un DJ contra la necesidad del evento y arma las razones del match. */
export function scoreDjForGig(dj: PublicDjProfile, need: GigNeed): ScoredDj {
  const reasons: MatchReason[] = [];
  let score = 0;

  // ── Relevancia (90) ──────────────────────────────────────────────
  // Género (35)
  if (need.genres.length === 0) {
    score += 35;
  } else {
    const wanted = need.genres.map(norm);
    const matched = dj.genres.filter((g) => wanted.includes(norm(g)));
    score += Math.round(35 * (matched.length / need.genres.length));
    if (matched.length > 0) {
      reasons.push({ label: `Toca ${matched.join(", ")}`, positive: true });
    }
  }

  // Ciudad (25)
  if (!need.city) {
    score += 25;
  } else if (dj.city && norm(dj.city).includes(norm(need.city))) {
    score += 25;
    reasons.push({ label: `En ${dj.city}`, positive: true });
  } else if (dj.city) {
    reasons.push({ label: `Otra ciudad (${dj.city})`, positive: false });
  }

  // Disponibilidad en la fecha (20)
  const avail = availabilityFor(dj.available_from, dj.available_until, need.eventDate);
  if (!need.eventDate) {
    score += 12;
  } else if (avail === "in") {
    score += 20;
    reasons.push({ label: `Disponible el ${fmtDate(need.eventDate)}`, positive: true });
  } else if (avail === "unknown") {
    score += 10;
    reasons.push({ label: "Disponibilidad sin confirmar", positive: false });
  } else {
    reasons.push({ label: "No marca disponible esa fecha", positive: false });
  }

  // Presupuesto (10)
  if (need.budget == null || need.budget <= 0) {
    score += 10;
  } else if (!dj.show_fee || dj.fee_min == null) {
    score += 7;
    reasons.push({ label: "Sin tarifa publicada", positive: false });
  } else if (dj.fee_min <= need.budget) {
    score += 10;
    reasons.push({ label: "Dentro de tu presupuesto", positive: true });
  } else {
    reasons.push({ label: "Sobre tu presupuesto", positive: false });
  }

  // ── Calidad / completitud (10) ───────────────────────────────────
  let quality = 7 * (dj.completeness / 100);
  if (dj.is_verified) {
    quality += 2;
    reasons.push({ label: "Verificado por DROP.", positive: true });
  }
  if (dj.is_drop_pick) {
    quality += 1;
    reasons.push({ label: "DROP Pick", positive: true });
  }
  score += Math.min(10, quality);

  return {
    dj,
    score: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
  };
}

/**
 * Ranquea la lista del directorio contra la necesidad. Único corte duro
 * (igual que /buscar): se excluye a quien publica tarifa y su mínimo claramente
 * supera el presupuesto. El resto se ordena por score (desempate: completitud,
 * luego nombre) y se corta al top `limit`.
 */
export function rankDjsForGig(
  djs: PublicDjProfile[],
  need: GigNeed,
  limit = 15
): ScoredDj[] {
  const overBudget = (dj: PublicDjProfile) =>
    need.budget != null &&
    need.budget > 0 &&
    dj.show_fee &&
    dj.fee_min != null &&
    dj.fee_min > need.budget;

  return djs
    .filter((dj) => !overBudget(dj))
    .map((dj) => scoreDjForGig(dj, need))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.dj.completeness - a.dj.completeness ||
        a.dj.artist_name.localeCompare(b.dj.artist_name)
    )
    .slice(0, limit);
}
