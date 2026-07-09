import "server-only";
import { unstable_cache } from "next/cache";
import { geocodeCityToBbox } from "@/lib/geo/nominatim";
import {
  buildVenueQueryForBbox,
  runOverpassDirect,
  classifyVenueByName,
  isVenueClosed,
  type OverpassNode,
} from "@/lib/overpass";

/**
 * "Sugeridos" de Lugares: venues candidatos de música electrónica traídos de
 * OpenStreetMap para la ciudad del DJ. NO se persisten (consulta en vivo +
 * caché) para evitar las obligaciones share-alike de la licencia ODbL.
 *
 * Reusa la lógica de calidad de `lib/overpass.ts` (descarta cerrados y la
 * blacklist de karaokes/schoperías; prioriza señales de DJ/electrónica).
 */

export interface SuggestedVenue {
  name: string;
  city: string;
  /** handle de Instagram sin @ (o ""). */
  instagram: string;
  website: string;
  phone: string;
  lat: number | null;
  lng: number | null;
  /** "node/123" — id estable de OSM (para dedupe / referencia). */
  sourceId: string;
  /** true si el nombre matchea keywords de DJ/electrónica. */
  highConfidence: boolean;
}

export const OSM_ATTRIBUTION = "Datos © OpenStreetMap contributors";

function mapElement(el: OverpassNode, fallbackCity: string): SuggestedVenue | null {
  const tags = el.tags || {};
  const name = tags["name"]?.trim();
  if (!name) return null; // sin nombre = ruido
  if (isVenueClosed(tags).closed) return null;
  const cls = classifyVenueByName(name);
  if (cls.blacklisted) return null;

  const instagram = (tags["contact:instagram"] || tags["instagram"] || "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .replace(/\/$/, "");
  const website = tags["contact:website"] || tags["website"] || tags["url"] || "";
  const phone = tags["contact:phone"] || tags["phone"] || "";

  return {
    name,
    city: tags["addr:city"] || fallbackCity,
    instagram,
    website,
    phone,
    lat: el.lat ?? el.center?.lat ?? null,
    lng: el.lon ?? el.center?.lon ?? null,
    sourceId: `${el.type}/${el.id}`,
    highConfidence: cls.highConfidence,
  };
}

async function loadSuggested(
  city: string,
  country?: string
): Promise<SuggestedVenue[]> {
  const geo = await geocodeCityToBbox(city, country);
  if (!geo) return []; // ciudad no encontrada → sin sugerencias

  const ql = buildVenueQueryForBbox(geo.bbox);
  const resp = await runOverpassDirect(ql); // puede lanzar (lo maneja el caller)

  const seen = new Set<string>();
  const venues: SuggestedVenue[] = [];
  for (const el of resp.elements || []) {
    const v = mapElement(el, city);
    if (!v) continue;
    const dedupeKey = v.name.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    venues.push(v);
  }
  // Prioriza alta confianza (keywords de DJ/electrónica) y limita el volumen.
  venues.sort((a, b) => Number(b.highConfidence) - Number(a.highConfidence));
  return venues.slice(0, 40);
}

export interface SuggestedVenuesResult {
  venues: SuggestedVenue[];
  /** null si OK; mensaje si Overpass/Nominatim fallaron (UI muestra reintentar). */
  error: string | null;
  attribution: string;
}

/**
 * Punto de entrada para la página. Cachea por ciudad (12 h). Degrada sin
 * romper: si Overpass falla, devuelve `error` y `venues: []`.
 */
export async function getSuggestedVenues(
  city: string,
  country?: string
): Promise<SuggestedVenuesResult> {
  const key = [
    "suggested-venues",
    city.trim().toLowerCase(),
    (country || "").trim().toLowerCase(),
  ];
  try {
    const cached = unstable_cache(() => loadSuggested(city, country), key, {
      revalidate: 60 * 60 * 12,
    });
    const venues = await cached();
    return { venues, error: null, attribution: OSM_ATTRIBUTION };
  } catch {
    return {
      venues: [],
      error: "No pudimos cargar sugerencias ahora. Reintenta en un momento.",
      attribution: OSM_ATTRIBUTION,
    };
  }
}
