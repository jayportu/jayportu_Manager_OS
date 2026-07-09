import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Geocoder liviano sobre Nominatim (OpenStreetMap) para resolver el nombre de
 * una ciudad a un bounding box usable por Overpass.
 *
 * - Gratis, sin API key. Nominatim EXIGE un User-Agent identificable y ~1 req/s;
 *   por eso cacheamos agresivamente (los bbox de una ciudad no cambian).
 * - Solo server-side (`server-only`).
 *
 * Formato de salida `bbox`: "south,west,north,east" (el que consume Overpass).
 */

export interface CityBbox {
  /** "south,west,north,east" para Overpass. */
  bbox: string;
  displayName: string;
}

async function fetchCityBbox(
  city: string,
  country?: string
): Promise<CityBbox | null> {
  const params = new URLSearchParams({ format: "jsonv2", city, limit: "1" });
  if (country) params.set("country", country);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          "User-Agent": "DROP/0.13 (hola@dropgigs.com)",
          "Accept-Language": "es",
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as Array<{
      boundingbox?: string[];
      display_name?: string;
    }>;
    const hit = data?.[0];
    if (!hit?.boundingbox || hit.boundingbox.length < 4) return null;

    // Nominatim entrega boundingbox = [south, north, west, east].
    // Overpass quiere "south,west,north,east".
    const bb = hit.boundingbox;
    const bbox = `${bb[0]},${bb[2]},${bb[1]},${bb[3]}`;
    return { bbox, displayName: hit.display_name || city };
  } catch {
    return null;
  }
}

/**
 * Versión cacheada (30 días) de {@link fetchCityBbox}. La key incluye
 * ciudad+país para no mezclar resultados.
 */
export function geocodeCityToBbox(
  city: string,
  country?: string
): Promise<CityBbox | null> {
  const key = ["nominatim-city", city.trim().toLowerCase(), (country || "").trim().toLowerCase()];
  return unstable_cache(() => fetchCityBbox(city, country), key, {
    revalidate: 60 * 60 * 24 * 30,
  })();
}
