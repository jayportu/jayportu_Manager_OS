/**
 * Presets de búsqueda exportados para usar en client components.
 * No incluye la query QL (esa solo se usa server-side).
 */
import { OVERPASS_PRESETS } from "@/lib/overpass";

export interface PresetSafe {
  id: string;
  label: string;
  description: string;
  inferredType: string;
}

export const OVERPASS_PRESETS_LIST: PresetSafe[] = OVERPASS_PRESETS.map(
  (p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    inferredType: p.inferredType,
  })
);
