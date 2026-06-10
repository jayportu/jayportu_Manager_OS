/**
 * v2 — "match semántico" SIN LLM ni embeddings: un parser heurístico que
 * mapea texto libre del booker ("energía de festival para un rooftop al
 * atardecer") a géneros + vibes, usando un diccionario de sinónimos. Cero
 * costo, cero dependencias externas, cero data afuera.
 *
 * Exclusivo de bookers Founding (perk "acceso anticipado").
 */

/** Normaliza: minúsculas + sin acentos, para matchear sin importar tildes. */
const DIACRITICS = /[̀-ͯ]/g;
function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(DIACRITICS, "");
}

/**
 * Diccionario de vibes → géneros canónicos. Las `keys` se buscan en el texto
 * (normalizado); los `genres` son nombres canónicos que luego se intersectan
 * con los géneros REALES del directorio (así nunca inventamos un género que
 * nadie toca). `label` es para mostrarle al booker qué interpretamos.
 */
const VIBES: { label: string; keys: string[]; genres: string[] }[] = [
  {
    label: "rooftop / atardecer",
    keys: ["rooftop", "sunset", "atardecer", "terraza", "azotea", "piscina", "pool", "playa", "beach", "chill", "relajado", "lento"],
    genres: ["deep house", "melodic techno", "afro house", "nu disco", "indie dance"],
  },
  {
    label: "festival / masivo",
    keys: ["festival", "masivo", "main stage", "mainstage", "grande", "multitud", "estadio", "arena"],
    genres: ["techno", "hard techno", "tech house", "progressive"],
  },
  {
    label: "íntimo / cena",
    keys: ["intimo", "lounge", "cena", "dinner", "bar", "restaurante", "restaurant", "cocktail", "coctel", "aperitivo"],
    genres: ["deep house", "nu disco", "jackin", "funky house"],
  },
  {
    label: "fiesta / club",
    keys: ["fiesta", "party", "club", "nightclub", "antro", "carrete", "peak", "prime", "pista", "bailar"],
    genres: ["tech house", "house", "minimal"],
  },
  {
    label: "boda / matrimonio",
    keys: ["boda", "matrimonio", "wedding", "casamiento", "novios"],
    genres: ["nu disco", "funky house", "house", "indie dance"],
  },
  {
    label: "corporativo",
    keys: ["corporativo", "corporate", "empresa", "lanzamiento", "brand", "marca", "evento de empresa"],
    genres: ["nu disco", "deep house", "house"],
  },
  {
    label: "underground / oscuro",
    keys: ["underground", "oscuro", "dark", "industrial", "crudo", "duro"],
    genres: ["minimal", "hard techno", "techno"],
  },
  {
    label: "groovy / funk",
    keys: ["groovy", "groove", "funky", "funk", "disco", "soul", "bailable"],
    genres: ["funky house", "jackin", "nu disco"],
  },
  {
    label: "melódico / viaje",
    keys: ["melodico", "melodic", "emotivo", "progresivo", "viaje", "journey", "atmosferico", "atmosferica"],
    genres: ["melodic techno", "progressive", "afro house"],
  },
  {
    label: "after / amanecer",
    keys: ["after", "afterparty", "amanecer", "sunrise", "trasnoche"],
    genres: ["minimal", "hard techno", "techno", "tech house"],
  },
];

export interface ParsedQuery {
  /** Géneros inferidos que SÍ existen en el directorio. */
  genres: string[];
  /** Etiquetas de vibe detectadas (para mostrar la interpretación). */
  vibes: string[];
}

/**
 * Parsea texto libre → géneros (intersectados con los reales) + vibes.
 * @param text     lo que escribió el booker
 * @param knownGenres géneros reales del directorio, en minúscula
 */
export function parseFreeText(text: string, knownGenres: string[]): ParsedQuery {
  const t = norm(text);
  if (!t.trim()) return { genres: [], vibes: [] };

  const known = new Set(knownGenres.map((g) => norm(g)));
  const collected = new Set<string>();
  const vibes: string[] = [];

  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const hasWord = (needle: string) => new RegExp(`\\b${esc(needle)}\\b`).test(t);

  // 1. Mención directa de un género real, con LÍMITES DE PALABRA (M1: que
  //    "warehouse" no cace "house"). Luego descarta un género si es subcadena
  //    por-palabra de otro más largo ya nombrado ("house" dentro de "tech house").
  const direct = knownGenres
    .map((g) => norm(g))
    .filter((g) => g.length >= 3 && hasWord(g));
  for (const g of direct) {
    const subsumed = direct.some(
      (other) =>
        other !== g &&
        other.length > g.length &&
        new RegExp(`\\b${esc(g)}\\b`).test(other)
    );
    if (!subsumed) collected.add(g);
  }

  // 2. Vibes → géneros (M2: keys con límites de palabra — "bar" no caza
  //    "barato"/"barrio"). Solo géneros que existen en el directorio.
  for (const v of VIBES) {
    if (v.keys.some((k) => hasWord(norm(k)))) {
      vibes.push(v.label);
      for (const g of v.genres) {
        if (known.has(norm(g))) collected.add(norm(g));
      }
    }
  }

  return {
    // Cap a 5 para no diluir el match con demasiados géneros.
    genres: Array.from(collected).slice(0, 5),
    vibes,
  };
}
