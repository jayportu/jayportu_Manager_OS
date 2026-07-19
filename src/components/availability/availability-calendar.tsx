/**
 * Capa 2 · Feature 3 — Calendario de disponibilidad para el press kit público.
 *
 * Server component. Pinta los próximos `months` meses marcando cada día como
 * Disponible (dentro de la ventana del DJ y libre), Ocupado (tiene gig/bloqueo)
 * o fuera de ventana. La ocupación se deriva de getPublicBusyDates (gigs que el
 * DJ ya sincroniza), sin que tenga que marcar nada a mano.
 */
import { santiagoToday } from "@/lib/tz";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"]; // lunes primero
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

interface Props {
  availableFrom: string | null;
  availableUntil: string | null;
  busyDates: string[];
  months?: number;
}

function ymd(year: number, month0: number, day: number): string {
  return `${year}-${String(month0 + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Celdas de un mes con blancos iniciales para alinear (lunes primero). */
function monthCells(year: number, month0: number): (string | null)[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const lead = (first.getUTCDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(ymd(year, month0, d));
  return cells;
}

export function AvailabilityCalendar({
  availableFrom,
  availableUntil,
  busyDates,
  months = 2,
}: Props) {
  const hasWindow = !!availableFrom;
  if (!hasWindow && busyDates.length === 0) return null;

  const today = santiagoToday();
  const busy = new Set(busyDates);

  // Meses a renderizar, partiendo del mes actual (en Chile).
  const [ty, tm] = today.split("-").map(Number);
  const grids = Array.from({ length: months }, (_, i) => {
    const month0 = tm - 1 + i;
    const year = ty + Math.floor(month0 / 12);
    const m = ((month0 % 12) + 12) % 12;
    return { year, month0: m, cells: monthCells(year, m) };
  });

  function dayStatus(date: string): "past" | "busy" | "available" | "out" {
    if (date < today) return "past";
    if (busy.has(date)) return "busy";
    const inWindow =
      hasWindow &&
      date >= availableFrom! &&
      (!availableUntil || date <= availableUntil);
    return inWindow ? "available" : "out";
  }

  return (
    <div>
      {/* Leyenda */}
      <div className="flex flex-wrap items-center gap-4 mb-4 font-mono text-[10px] uppercase tracking-wider text-fg-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[rgb(var(--drop-orange))]" /> Disponible
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-white/10 border border-white/15" /> Ocupado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-white/[0.04] border border-white/12" /> Sin definir
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-5">
        {grids.map(({ year, month0, cells }) => (
          <div key={`${year}-${month0}`} className="rounded-xl border border-white/12 bg-white/[0.04] overflow-hidden">
            <div className="bg-white/[0.06] text-white px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-white/10">
              {MONTH_NAMES[month0]} {year}
            </div>
            <div className="p-2">
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={i}
                    className="text-center font-mono text-[9px] font-bold text-fg-subtle"
                  >
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} />;
                  const dayNum = Number(date.slice(8, 10));
                  const status = dayStatus(date);
                  const cls =
                    status === "available"
                      ? "bg-[rgb(var(--drop-orange))] text-black font-bold"
                      : status === "busy"
                        ? "bg-white/10 text-white/40 line-through"
                        : status === "past"
                          ? "text-white/20"
                          : "text-fg-muted";
                  return (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center text-[11px] tabular-nums rounded-md ${cls}`}
                    >
                      {dayNum}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
