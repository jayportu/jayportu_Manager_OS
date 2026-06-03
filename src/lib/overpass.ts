/**
 * Cliente para Overpass API (OpenStreetMap).
 * Gratis, sin tarjeta, sin API key.
 *
 * Endpoint público: https://overpass-api.de/api/interpreter
 * Limit: ~10000 queries/día por IP (más que suficiente)
 *
 * Documentación queries Overpass QL:
 * https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide
 */

/**
 * El cliente NO llama Overpass directo (problemas CORS desde browser).
 * Llama a nuestro proxy server-side que hace failover entre mirrors.
 */
const OVERPASS_PROXY = "/api/overpass";

export interface OverpassNode {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface OverpassResponse {
  elements: OverpassNode[];
  version?: number;
  generator?: string;
}

export interface OverpassPreset {
  id: string;
  label: string;
  description: string;
  inferredType:
    | "club"
    | "bar"
    | "rooftop"
    | "festival"
    | "productora"
    | "otro";
  /** Query QL completa */
  ql: string;
}

/**
 * Presets de búsqueda para Santiago de Chile.
 * Bounding box aprox de Gran Santiago: -33.65,-70.85,-33.32,-70.45
 */
const SCL_BBOX = "-33.65,-70.85,-33.32,-70.45";

export const OVERPASS_PRESETS: OverpassPreset[] = [
  {
    id: "scl-nightclubs",
    label: "Clubes nocturnos · Santiago",
    description: "Discotecas con tag amenity=nightclub en Gran Santiago",
    inferredType: "club",
    ql: `
[out:json][timeout:25];
(
  nwr["amenity"="nightclub"](${SCL_BBOX});
);
out center tags;
`.trim(),
  },
  {
    id: "scl-bars-music",
    label: "Bares con música · Santiago",
    description:
      "Bares y pubs en Gran Santiago (pueden tener noches con DJ)",
    inferredType: "bar",
    ql: `
[out:json][timeout:25];
(
  nwr["amenity"="bar"](${SCL_BBOX});
  nwr["amenity"="pub"](${SCL_BBOX});
);
out center tags;
`.trim(),
  },
  {
    id: "scl-restaurants-rooftop",
    label: "Rooftops · Santiago",
    description:
      "Restaurantes/bares con tag rooftop=yes o roof_terrace en Gran Santiago",
    inferredType: "rooftop",
    ql: `
[out:json][timeout:25];
(
  nwr["rooftop"="yes"](${SCL_BBOX});
  nwr["roof:terrace"="yes"](${SCL_BBOX});
  nwr["building:roof"="terrace"](${SCL_BBOX});
);
out center tags;
`.trim(),
  },
  {
    id: "scl-event-venues",
    label: "Salas de eventos · Santiago",
    description: "Lugares tag amenity=events_venue o community_centre",
    inferredType: "otro",
    ql: `
[out:json][timeout:25];
(
  nwr["amenity"="events_venue"](${SCL_BBOX});
  nwr["amenity"="community_centre"](${SCL_BBOX});
);
out center tags;
`.trim(),
  },
];

export function findPreset(id: string): OverpassPreset | null {
  return OVERPASS_PRESETS.find((p) => p.id === id) || null;
}

/**
 * Palabras en el nombre que sugieren que el venue NO es club de DJ.
 * Schoperías, topless, cabarets, cafés con piernas, etc. — esos
 * usan el tag amenity=nightclub en OSM pero no son nuestro target.
 *
 * Match es case-insensitive y por substring.
 */
export const VENUE_BLACKLIST_KEYWORDS = [
  // Adult / strip
  "topless",
  "strip",
  "cabaret",
  "show de",
  "vip lounge",
  "burlesque",
  "gentlemen",
  "playboy",
  "adult",
  // Schoperías y cafés
  "schop",
  "schoperia",
  "schopería",
  "café con",
  "cafe con",
  "café con piernas",
  // Casos específicos conocidos en Santiago
  "passapoga",
  "hand in hand",
  "bunker top",
  // Karaoke
  "karaoke",
];

/**
 * Palabras que aumentan confianza de que SÍ es club de electrónica/baile.
 * Si el nombre/descripción matchea, marcamos como "high confidence".
 */
export const VENUE_DJ_KEYWORDS = [
  "electronic",
  "electrónica",
  "techno",
  "house",
  "club",
  "disco",
  "rave",
  "dance",
  "music",
  "música",
  "dj",
  "live",
  "underground",
];

export interface VenueFilterResult {
  blacklisted: boolean;
  blacklistMatch?: string;
  djMatch?: string;
  highConfidence: boolean;
}

export function classifyVenueByName(name: string): VenueFilterResult {
  const lower = name.toLowerCase();
  const black = VENUE_BLACKLIST_KEYWORDS.find((kw) => lower.includes(kw));
  if (black) {
    return { blacklisted: true, blacklistMatch: black, highConfidence: false };
  }
  const dj = VENUE_DJ_KEYWORDS.find((kw) => lower.includes(kw));
  return {
    blacklisted: false,
    djMatch: dj,
    highConfidence: !!dj,
  };
}

/**
 * Prefijos de "ciclo de vida" de OSM: cuando un lugar deja de operar, los
 * mapeadores suelen renombrar la clave del tag (ej. amenity → disused:amenity).
 * Si un elemento todavía trae el amenity activo PERO además carga uno de estos
 * prefijos, es un local muerto que se filtró mal.
 * Ref: https://wiki.openstreetmap.org/wiki/Lifecycle_prefix
 */
export const OSM_LIFECYCLE_PREFIXES = [
  "disused:",
  "abandoned:",
  "was:",
  "removed:",
  "razed:",
  "demolished:",
  "destroyed:",
  "closed:",
];

/**
 * Palabras en el nombre que delatan que el local ya cerró. Conservador a
 * propósito (solo cierres explícitos) para no descartar nombres legítimos.
 */
const NAME_CLOSED_KEYWORDS = [
  "cerrado",
  "cerrada",
  "clausurad",
  "permanently closed",
  "closed permanently",
];

export interface VenueClosedResult {
  closed: boolean;
  reason?: string;
}

/**
 * Detecta si los tags OSM indican que el local está cerrado / en desuso.
 * OSM marca esto de forma inconsistente, así que cubrimos los casos más
 * comunes. No es exhaustivo: si OSM simplemente no se actualizó, no hay señal
 * que leer (eso se resuelve con verificación contra una fuente con estado de
 * negocio, ej. Google Places — pendiente de roadmap).
 */
export function isVenueClosed(
  tags: Record<string, string>
): VenueClosedResult {
  // 1. Claves con prefijo de ciclo de vida (disused:*, was:*, etc.)
  for (const key of Object.keys(tags)) {
    const prefix = OSM_LIFECYCLE_PREFIXES.find((p) => key.startsWith(p));
    if (prefix) return { closed: true, reason: key };
  }
  // 2. Flags directas disused=yes / abandoned=yes
  if (/^(yes|1|true)$/i.test(tags["disused"] || "")) {
    return { closed: true, reason: "disused=yes" };
  }
  if (/^(yes|1|true)$/i.test(tags["abandoned"] || "")) {
    return { closed: true, reason: "abandoned=yes" };
  }
  // 3. opening_hours marcado como cerrado permanente
  const oh = (tags["opening_hours"] || "").toLowerCase().trim();
  if (oh === "closed" || oh === "off") {
    return { closed: true, reason: "opening_hours=closed" };
  }
  // 4. end_date presente (el lugar dejó de existir en esa fecha)
  if (tags["end_date"]) {
    return { closed: true, reason: `end_date=${tags["end_date"]}` };
  }
  // 5. Nombre con marca explícita de cierre
  const name = (tags["name"] || "").toLowerCase();
  const nameHit = NAME_CLOSED_KEYWORDS.find((kw) => name.includes(kw));
  if (nameHit) return { closed: true, reason: `nombre~"${nameHit}"` };

  return { closed: false };
}

export async function runOverpassQuery(
  ql: string,
  signal?: AbortSignal
): Promise<OverpassResponse> {
  // Llamada a nuestro proxy (mismo origin = sin CORS).
  // El servidor maneja failover entre mirrors de Overpass.
  const res = await fetch(OVERPASS_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ql }),
    signal,
  });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) detail = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await res.json()) as OverpassResponse;
}

/**
 * Normaliza un elemento Overpass al shape de lead.
 */
export function normalizeOverpassElement(
  el: OverpassNode,
  preset: OverpassPreset
): {
  name: string;
  city: string;
  country: string;
  address: string;
  lat: number | null;
  lng: number | null;
  instagram: string;
  website: string;
  phone: string;
  email: string;
  source_id: string;
  raw_data: Record<string, unknown>;
} {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat ?? null;
  const lng = el.lon ?? el.center?.lon ?? null;

  const ig = (
    tags["contact:instagram"] ||
    tags["instagram"] ||
    ""
  )
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "");

  const website =
    tags["contact:website"] || tags["website"] || tags["url"] || "";
  const phone = tags["contact:phone"] || tags["phone"] || "";
  const email = tags["contact:email"] || tags["email"] || "";

  const street = tags["addr:street"] || "";
  const num = tags["addr:housenumber"] || "";
  const address = [street, num].filter(Boolean).join(" ");

  return {
    name: tags["name"] || `(sin nombre · ${el.id})`,
    city: tags["addr:city"] || "Santiago",
    country: "Chile",
    address,
    lat,
    lng,
    instagram: ig,
    website,
    phone,
    email,
    source_id: `${el.type}/${el.id}`,
    raw_data: { type: el.type, id: el.id, tags, preset: preset.id },
  };
}
