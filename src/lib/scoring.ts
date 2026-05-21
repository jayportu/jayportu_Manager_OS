/**
 * Cálculo automático del score (0–100) de un contacto.
 *
 * Reglas heurísticas basadas en los datos disponibles. La IA local
 * en Sprint 4 va a refinar esto (analizando notas, contenido público
 * del IG/web, contexto). Por ahora reglas determinísticas.
 *
 * Si el campo se ajusta a mano más adelante, podemos agregar un
 * "manual_score_override" — pero por ahora 100% automático.
 */
import type { Contact, ContactType, ContactStatus } from "@/types/database";

interface MinimalContact {
  type: ContactType;
  status: ContactStatus;
  city: string;
  country: string;
  email: string;
  whatsapp: string;
  instagram: string;
  website: string;
  contact_person: string;
  music_style: string;
}

interface ScoreBreakdown {
  score: number;
  reason: string;
  factors: { label: string; value: number }[];
}

const TYPE_SCORES: Record<ContactType, number> = {
  festival: 15,
  booker: 15,
  club: 12,
  productora: 12,
  rooftop: 10,
  bar: 8,
  marca: 8,
  promotor: 8,
  dj: 7,
  cliente_evento_privado: 6,
  productor_musical: 5,
  fan_seguidor: 0,
  otro: 3,
};

const STATUS_SCORES: Record<ContactStatus, number> = {
  nuevo: 0,
  contactado: 5,
  respondio: 10,
  interesado: 15,
  propuesta_enviada: 12,
  negociando: 18,
  confirmado: 20,
  realizado: 8,
  perdido: -10,
  recontactar_despues: -5,
  ignorar: -30,
};

const MY_GENRES = [
  "house",
  "tech",
  "jackin",
  "progressive",
  "melodic",
  "minimal",
  "funky",
];

const TARGET_CITY = "santiago";
const TARGET_COUNTRY = "chile";

export interface ComputeScoreInput {
  contact: MinimalContact;
  /** Cantidad de interacciones del contacto */
  interactionsCount?: number;
  /** Timestamp ISO de la interacción más reciente, o null si no hay */
  lastInteractionAt?: string | null;
}

export function computeContactScore({
  contact,
  interactionsCount = 0,
  lastInteractionAt = null,
}: ComputeScoreInput): ScoreBreakdown {
  const factors: { label: string; value: number }[] = [];

  // ─ Baseline ─────────────────────────────────
  let score = 30;
  factors.push({ label: "Baseline", value: 30 });

  // ─ Completitud (max 25) ─────────────────────
  if (contact.whatsapp.trim().length > 0) {
    score += 8;
    factors.push({ label: "WhatsApp", value: 8 });
  }
  if (contact.email.trim().length > 0) {
    score += 5;
    factors.push({ label: "Email", value: 5 });
  }
  if (contact.instagram.trim().length > 0) {
    score += 6;
    factors.push({ label: "Instagram", value: 6 });
  }
  if (contact.website.trim().length > 0) {
    score += 3;
    factors.push({ label: "Website", value: 3 });
  }
  if (contact.contact_person.trim().length > 0) {
    score += 3;
    factors.push({ label: "Contacto identificado", value: 3 });
  }

  // ─ Tipo (max 15) ────────────────────────────
  const typeScore = TYPE_SCORES[contact.type] ?? 0;
  if (typeScore !== 0) {
    score += typeScore;
    factors.push({ label: `Tipo: ${contact.type}`, value: typeScore });
  }

  // ─ Ciudad objetivo (max 10) ─────────────────
  const cityLower = (contact.city || "").toLowerCase();
  const countryLower = (contact.country || "").toLowerCase();
  if (cityLower.includes(TARGET_CITY)) {
    score += 10;
    factors.push({ label: "Santiago (ciudad foco)", value: 10 });
  } else if (countryLower.includes(TARGET_COUNTRY)) {
    score += 5;
    factors.push({ label: "Chile", value: 5 });
  }

  // ─ Match estilo musical (max 15) ────────────
  const musicLower = (contact.music_style || "").toLowerCase();
  const matched = MY_GENRES.filter((g) => musicLower.includes(g));
  if (matched.length > 0) {
    const bonus = Math.min(15, matched.length * 5);
    score += bonus;
    factors.push({
      label: `Estilo match: ${matched.join(", ")}`,
      value: bonus,
    });
  }

  // ─ Estado del pipeline (-30 a +20) ──────────
  const statusScore = STATUS_SCORES[contact.status] ?? 0;
  if (statusScore !== 0) {
    score += statusScore;
    factors.push({
      label: `Estado: ${contact.status}`,
      value: statusScore,
    });
  }

  // ─ Interacciones (max 10) ───────────────────
  if (interactionsCount > 0) {
    score += 5;
    factors.push({ label: "Hay interacciones", value: 5 });

    if (lastInteractionAt) {
      const daysSince =
        (Date.now() - new Date(lastInteractionAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        score += 5;
        factors.push({ label: "Interacción reciente (<30d)", value: 5 });
      }
    }
  }

  // Clamp 0–100
  const finalScore = Math.min(100, Math.max(0, Math.round(score)));

  // Texto resumido para guardar en score_reason
  const reason = factors
    .map((f) => `${f.value >= 0 ? "+" : ""}${f.value} ${f.label}`)
    .join(" · ");

  return { score: finalScore, reason, factors };
}

/**
 * Helper: dado un contacto completo (como viene de la DB), computa el score.
 * Para usar después de fetchear interactions count.
 */
export function computeScoreForContact(
  contact: Pick<
    Contact,
    | "type"
    | "status"
    | "city"
    | "country"
    | "email"
    | "whatsapp"
    | "instagram"
    | "website"
    | "contact_person"
    | "music_style"
  >,
  interactionsCount = 0,
  lastInteractionAt: string | null = null
): ScoreBreakdown {
  return computeContactScore({
    contact: {
      type: contact.type,
      status: contact.status,
      city: contact.city,
      country: contact.country,
      email: contact.email,
      whatsapp: contact.whatsapp,
      instagram: contact.instagram,
      website: contact.website,
      contact_person: contact.contact_person,
      music_style: contact.music_style,
    },
    interactionsCount,
    lastInteractionAt,
  });
}

/** Color del badge según rango */
export function scoreLevel(score: number): {
  level: "alta" | "buena" | "tibia" | "baja";
  label: string;
} {
  if (score >= 80) return { level: "alta", label: "Alta prioridad" };
  if (score >= 60) return { level: "buena", label: "Buena oportunidad" };
  if (score >= 40) return { level: "tibia", label: "Tibia" };
  return { level: "baja", label: "Baja prioridad" };
}
