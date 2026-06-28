import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listMyEvents } from "@/lib/queries/calendar-events";
import type { CalendarEventRow } from "@/lib/calendar/types";

const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const SANTIAGO_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Clave de fecha calendario "YYYY-MM-DD" en hora de Santiago para un timestamp. */
function santiagoKey(iso: string): string {
  return SANTIAGO_FMT.format(new Date(iso));
}
function dateKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function monthParam(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

/** Estilo del pill de evento según estado de pago (consistente con la vista lista). */
function eventStyle(ev: CalendarEventRow): { pill: string; dot: string } {
  const hasAmount = ev.amount_clp !== null && ev.amount_clp > 0;
  if (hasAmount && ev.payment_status === "paid")
    return { pill: "bg-success/15 text-success border border-success/30", dot: "bg-success" };
  if (hasAmount && ev.payment_status === "pending")
    return { pill: "bg-warning/15 text-warning border border-warning/30", dot: "bg-warning" };
  if (hasAmount && ev.payment_status === "partial")
    return { pill: "bg-info/15 text-info border border-info/30", dot: "bg-info" };
  return { pill: "bg-bg-subtle text-fg-muted border border-border", dot: "bg-orange" };
}

/**
 * Resuelve el mes a mostrar desde el param `?month=YYYY-MM`. Si falta o es
 * inválido, usa el mes actual en hora de Santiago.
 */
export function resolveMonth(param: string | undefined): { year: number; month: number } {
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && year >= 2000 && year <= 2100) return { year, month };
  }
  const [y, mo] = SANTIAGO_FMT.format(new Date()).split("-");
  return { year: Number(y), month: Number(mo) };
}

export async function MonthView({ year, month }: { year: number; month: number }) {
  // Grid Monday-first. Construimos las fechas-calendario con aritmética en UTC
  // (sin DST) y comparamos por clave "YYYY-MM-DD" — los eventos se ubican por
  // su fecha LOCAL de Santiago, así que todo es comparación de fecha-calendario.
  const firstUTC = new Date(Date.UTC(year, month - 1, 1));
  const offsetToMonday = (firstUTC.getUTCDay() + 6) % 7;
  const gridStart = new Date(Date.UTC(year, month - 1, 1 - offsetToMonday));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: { y: number; m: number; d: number; key: string; inMonth: boolean }[] = [];
  const cur = new Date(gridStart);
  for (let week = 0; week < 6; week++) {
    // Cortamos cuando una semana empieza ya pasado el mes objetivo.
    if (cur.getUTCFullYear() > year || (cur.getUTCFullYear() === year && cur.getUTCMonth() + 1 > month)) {
      break;
    }
    for (let i = 0; i < 7; i++) {
      const cy = cur.getUTCFullYear();
      const cm = cur.getUTCMonth() + 1;
      const cd = cur.getUTCDate();
      cells.push({ y: cy, m: cm, d: cd, key: dateKey(cy, cm, cd), inMonth: cy === year && cm === month });
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  const last = cells[cells.length - 1];

  // Rango de fetch con buffer de ±1 día (el bucketing por fecha de Santiago
  // coloca cada evento en su celda; eventos fuera de la grilla se ignoran).
  const fromISO = new Date(Date.UTC(gridStart.getUTCFullYear(), gridStart.getUTCMonth(), gridStart.getUTCDate() - 1)).toISOString();
  const toISO = new Date(Date.UTC(last.y, last.m - 1, last.d + 2)).toISOString();
  const events = await listMyEvents({ fromISO, toISO });

  const byDay = new Map<string, CalendarEventRow[]>();
  for (const ev of events) {
    const k = santiagoKey(ev.start_at);
    const arr = byDay.get(k);
    if (arr) arr.push(ev);
    else byDay.set(k, [ev]);
  }

  const today = SANTIAGO_FMT.format(new Date());
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  const monthEventCount = cells.reduce(
    (n, c) => (c.inMonth ? n + (byDay.get(c.key)?.length ?? 0) : n),
    0
  );

  const navBtn =
    "inline-flex items-center justify-center w-9 h-9 border-2 border-border text-fg-muted hover:border-orange hover:text-orange transition-colors";

  return (
    <section className="mb-6">
      <div className="border-2 border-border bg-bg-panel">
        {/* Header: mes + navegación */}
        <div className="flex items-center justify-between gap-3 p-4 border-b-2 border-border">
          <div className="font-display text-2xl md:text-3xl leading-none">
            {MONTHS[month - 1]} <span className="text-fg-muted">{year}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/calendario?view=mes&month=${monthParam(prev.y, prev.m)}`}
              className={navBtn}
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <Link
              href="/calendario?view=mes"
              className="inline-flex items-center h-9 px-3 border-2 border-border font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-fg-muted hover:border-orange hover:text-orange transition-colors"
            >
              Hoy
            </Link>
            <Link
              href={`/calendario?view=mes&month=${monthParam(next.y, next.m)}`}
              className={navBtn}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* Días de la semana */}
        <div className="grid grid-cols-7 border-b-2 border-border">
          {DOW.map((d) => (
            <div
              key={d}
              className="px-2 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-fg-muted"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grilla (gap-px sobre bg-border = líneas divisorias limpias) */}
        <div className="grid grid-cols-7 gap-px bg-border">
          {cells.map((cell) => {
            const evs = byDay.get(cell.key) ?? [];
            const isToday = cell.key === today;
            const shown = evs.slice(0, 3);
            const extra = evs.length - shown.length;
            return (
              <div
                key={cell.key}
                className={`min-h-[88px] md:min-h-[108px] p-1.5 ${
                  cell.inMonth ? "bg-bg-panel" : "bg-bg"
                }`}
              >
                <div
                  className={
                    isToday
                      ? "w-6 h-6 rounded-full bg-orange text-ink flex items-center justify-center font-mono text-[11px] font-bold"
                      : `font-mono text-[12px] ${cell.inMonth ? "text-fg-muted" : "text-fg-subtle"}`
                  }
                >
                  {String(cell.d).padStart(2, "0")}
                </div>
                <div className="mt-1 space-y-1">
                  {shown.map((ev) => {
                    const s = eventStyle(ev);
                    return (
                      <Link
                        key={ev.id}
                        href={`/calendario/${ev.id}/evento`}
                        className={`flex items-center gap-1.5 px-1.5 py-1 ${s.pill} hover:brightness-110 transition-[filter]`}
                        title={ev.title}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} aria-hidden="true" />
                        <span className="text-[11px] leading-none truncate hidden sm:block">
                          {ev.title}
                        </span>
                      </Link>
                    );
                  })}
                  {extra > 0 && (
                    <div className="font-mono text-[9px] text-fg-subtle px-1.5">+{extra} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leyenda + total del mes */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3 px-1 font-mono text-[10px] uppercase tracking-[0.04em] text-fg-muted">
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-success" /> Pagado
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-warning" /> Pendiente
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-info" /> Parcial
        </span>
        <span className="flex items-center gap-1.5">
          <i className="w-2 h-2 rounded-full bg-orange" /> Otro evento
        </span>
        <span className="ml-auto text-fg-subtle">
          {monthEventCount} {monthEventCount === 1 ? "evento" : "eventos"} este mes
        </span>
      </div>
    </section>
  );
}
