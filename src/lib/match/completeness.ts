/**
 * Completitud de perfil de DJ. Una sola fuente de verdad para:
 *  1. el factor "calidad" del scoring de Smart Match (más completo → más arriba), y
 *  2. el nudge que ve el DJ en /perfil ("estás X% completo → llena Y").
 *
 * Así el incentivo que ve el DJ calza exactamente con cómo lo rankeamos.
 *
 * Tipado estructural (todos los campos opcionales) para que sirva tanto con un
 * `DjProfile` completo como con el subset del directorio.
 */

export interface CompletenessInput {
  artist_name?: string | null;
  bio_short?: string | null;
  bio_long?: string | null;
  genres?: string[] | null;
  city?: string | null;
  avatar_url?: string | null;
  hero_image_url?: string | null;
  public_email?: string | null;
  whatsapp?: string | null;
  featured_sets?: string[] | null;
  show_fee?: boolean | null;
  fee_min?: number | null;
  available_from?: string | null;
  brands_worked?: string[] | null;
  aliases?: string[] | null;
  record_label?: string | null;
  instagram_url?: string | null;
  soundcloud_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  website?: string | null;
}

export interface CompletenessResult {
  /** 0–100 redondeado. */
  percent: number;
  /** Campos de alto valor sin llenar, en orden de impacto (para el nudge). */
  missing: string[];
}

const has = (s?: string | null) => !!(s && s.trim().length > 0);
const hasArr = (a?: string[] | null) => Array.isArray(a) && a.length > 0;

/**
 * Cada chequeo aporta `points` si está lleno; si no, su `label` entra a
 * `missing`. Core = lo mínimo para aparecer bien; Rich = lo que sube ranking.
 * Total de puntos = 100.
 */
export function computeCompleteness(p: CompletenessInput): CompletenessResult {
  const checks: { ok: boolean; points: number; label: string }[] = [
    // Core (60)
    { ok: has(p.artist_name), points: 10, label: "nombre artístico" },
    { ok: has(p.bio_short), points: 10, label: "bio corta" },
    { ok: hasArr(p.genres), points: 10, label: "géneros" },
    { ok: has(p.city), points: 10, label: "ciudad" },
    { ok: has(p.avatar_url) || has(p.hero_image_url), points: 10, label: "foto" },
    {
      ok: has(p.public_email) || has(p.whatsapp),
      points: 10,
      label: "contacto (email o WhatsApp)",
    },
    // Rich (40)
    { ok: hasArr(p.featured_sets), points: 8, label: "un set destacado" },
    { ok: has(p.bio_long), points: 6, label: "bio larga" },
    {
      ok: !!p.show_fee && p.fee_min != null,
      points: 6,
      label: "tarifa referencial",
    },
    { ok: has(p.available_from), points: 6, label: "disponibilidad" },
    { ok: hasArr(p.brands_worked), points: 5, label: "marcas/clubs" },
    {
      ok:
        has(p.instagram_url) ||
        has(p.soundcloud_url) ||
        has(p.youtube_url) ||
        has(p.spotify_url) ||
        has(p.website),
      points: 5,
      label: "una red social",
    },
    {
      ok: hasArr(p.aliases) || has(p.record_label),
      points: 4,
      label: "alias o sello",
    },
  ];

  const earned = checks.reduce((sum, c) => sum + (c.ok ? c.points : 0), 0);
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);

  return { percent: Math.round(earned), missing };
}
