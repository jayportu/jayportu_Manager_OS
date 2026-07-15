/**
 * Sprint 21 — Render público del tech rider estructurado.
 *
 * Server component: recibe items ya filtrados y los muestra agrupados por
 * categoría. Reemplaza el campo libre tech_rider_ideal/alt cuando hay items.
 */

import {
  RIDER_CATEGORIES,
  RIDER_CATEGORY_LABELS,
  type TechRiderItem,
} from "@/types/database";
import { groupItemsByCategory } from "@/lib/queries/tech-rider";

interface Props {
  items: TechRiderItem[];
  hospitalityNote?: string;
}

export function TechRiderRender({ items, hospitalityNote }: Props) {
  const groups = groupItemsByCategory(items);
  // No mostramos categorías vacías
  const visibleCategories = RIDER_CATEGORIES.filter((c) => groups[c].length > 0);
  if (visibleCategories.length === 0 && !hospitalityNote) return null;

  return (
    <details className="group">
      <summary className="cursor-pointer flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.3em] text-orange font-semibold mb-2 list-none">
        <span>Ver equipo detallado</span>
        <span className="text-fg-muted group-open:rotate-180 transition-transform">
          ▾
        </span>
      </summary>
      <div className="mt-4 grid md:grid-cols-2 gap-4">
        {visibleCategories.map((cat) => (
          <div
            key={cat}
            className="p-4 rounded-2xl hos-glass"
          >
            <div className="text-xs uppercase tracking-wider text-fg-muted mb-3 font-semibold">
              {RIDER_CATEGORY_LABELS[cat]}
            </div>
            <ul className="space-y-1.5 text-sm">
              {groups[cat].map((item) => (
                <li key={item.id} className="flex items-baseline gap-2">
                  <span className="text-fg-muted font-mono text-[11px] shrink-0 w-6">
                    {item.quantity}×
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    {item.alt_text && (
                      <div className="text-[11px] text-fg-subtle italic">
                        alt: {item.alt_text}
                      </div>
                    )}
                    {item.note && (
                      <div className="text-[11px] text-fg-muted">
                        {item.note}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {hospitalityNote && groups.hospitality.length === 0 && (
        <div className="mt-4 p-4 rounded-2xl hos-glass">
          <div className="text-xs uppercase tracking-wider text-fg-muted mb-2 font-semibold">
            Hospitality
          </div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {hospitalityNote}
          </div>
        </div>
      )}
    </details>
  );
}
