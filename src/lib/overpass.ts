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
 * Mirrors de Overpass API ordenados por confiabilidad observada.
 * Intentamos en orden y caemos al siguiente si el actual falla.
 *
 * Histórico:
 * - overpass-api.de (oficial): a veces responde 406 a POST. Skipeable.
 * - kumi.systems: mirror estable mantenido por la comunidad. Buen uptime.
 * - lz4.overpass-api.de: load-balancer del principal, mismo problema.
 */
const OVERPASS_MIRRORS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
];

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

export async function runOverpassQuery(
  ql: string,
  signal?: AbortSignal
): Promise<OverpassResponse> {
  // Importante (cross-origin desde browser):
  // - NO setear User-Agent (header prohibido en fetch del browser,
  //   rompe el preflight CORS).
  // - NO setear Accept custom (browser default es OK).
  // - POST con URLSearchParams (Content-Type form-urlencoded está
  //   CORS-safelisted, no triggea preflight).
  // - Failover entre mirrors si uno falla.
  const body = new URLSearchParams({ data: ql });
  const errors: string[] = [];

  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body,
        signal,
      });
      if (res.ok) {
        return (await res.json()) as OverpassResponse;
      }
      errors.push(`${new URL(url).hostname}: ${res.status}`);
    } catch (e) {
      errors.push(
        `${new URL(url).hostname}: ${e instanceof Error ? e.message : "net err"}`
      );
    }
  }

  throw new Error(`Todos los mirrors fallaron — ${errors.join(" · ")}`);
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
