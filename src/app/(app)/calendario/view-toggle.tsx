import Link from "next/link";
import { List, CalendarDays } from "lucide-react";

/**
 * Toggle Lista / Mes del calendario (SSR, vía URL param `view`).
 * Estilo brutalist consistente con el resto de la app (border-2, sin radius).
 * El "Mapa" llega en una iteración aparte (necesita decisión de datos: las
 * ubicaciones son texto libre, sin coordenadas → geocoding o agrupar por ciudad).
 */
export function CalendarViewToggle({ current }: { current: "lista" | "mes" }) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors";
  const on = "bg-orange text-ink";
  const off = "text-fg-muted hover:text-fg";
  return (
    <div className="inline-flex border-2 border-border bg-bg-panel">
      <Link
        href="/calendario"
        className={`${base} ${current === "lista" ? on : off}`}
        aria-current={current === "lista" ? "page" : undefined}
      >
        <List className="w-3.5 h-3.5" aria-hidden="true" /> Lista
      </Link>
      <Link
        href="/calendario?view=mes"
        className={`${base} border-l-2 border-border ${current === "mes" ? on : off}`}
        aria-current={current === "mes" ? "page" : undefined}
      >
        <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> Mes
      </Link>
    </div>
  );
}
