import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listMyEvents } from "@/lib/queries/calendar-events";
import type { CalendarEventRow, PaymentStatus } from "@/lib/calendar/types";
import { GlassPanel, Badge } from "@/components/hos";

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

/**
 * Tono semántico de pago (Badge) — FUENTE ÚNICA del mapeo estado→tono.
 * Antes triplicado (tintes de `EventRow` en page.tsx, `CobroRow`/`CobradoRow`
 * en cobros-view.tsx y el `eventStyle` de esta vista, cada uno con su propia
 * lógica de colores). Ahora un solo lugar: los mismos 4 estados de pago
 * (paid/pending/partial/none) siempre resuelven al mismo tono/color en las
 * 3 vistas — page.tsx y cobros-view.tsx importan esta función desde acá.
 */
export type PayTone = "up" | "warn" | "info" | "neutral";

export function payTone(status: PaymentStatus, hasAmount: boolean): PayTone {
  if (hasAmount && status === "paid") return "up";
  if (hasAmount && status === "pending") return "warn";
  if (hasAmount && status === "partial") return "info";
  return "neutral";
}

/* Color sólido por tono (mismos tokens que usa el Badge del kit) — para el
   punto/realce de los pills del grid, donde el <Badge> completo (pill mayús-
   cula) no cabe junto al título truncado del evento. */
const TONE_DOT: Record<PayTone, string> = {
  up: "rgb(var(--drop-success))",
  warn: "rgb(var(--drop-warning))",
  info: "rgb(var(--drop-info))",
  neutral: "rgba(255,255,255,.4)",
};

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
    "hos-clay-btn inline-flex items-center justify-center w-9 h-9 rounded-full text-white/55 hover:text-orange transition-colors";

  return (
    <section className="mb-6">
      {/* Blur solo acá (contenedor top-level) — celdas y pills adentro son superficies sólidas */}
      <GlassPanel>
        {/* Header: mes + navegación */}
        <div className="flex items-center justify-between gap-3 pb-4">
          <div className="font-display text-2xl leading-none md:text-3xl">
            {MONTHS[month - 1]} <span className="text-white/40">{year}</span>
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
              className="hos-clay-btn inline-flex h-9 items-center rounded-full px-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white/55 hover:text-orange transition-colors"
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
        <div className="grid grid-cols-7 border-b border-white/10 pb-2">
          {DOW.map((d) => (
            <div
              key={d}
              className="px-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white/35"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Grilla — celdas SÓLIDAS (sin backdrop-filter), separadas por un gap fino */}
        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const evs = byDay.get(cell.key) ?? [];
            const isToday = cell.key === today;
            const shown = evs.slice(0, 3);
            const extra = evs.length - shown.length;
            return (
              <div
                key={cell.key}
                className="min-h-[88px] rounded-lg p-1.5 md:min-h-[108px]"
                style={{ background: cell.inMonth ? "rgba(255,255,255,.03)" : "rgba(255,255,255,.01)" }}
              >
                <div
                  className={
                    isToday
                      ? "flex h-6 w-6 items-center justify-center rounded-full bg-orange font-mono text-[11px] font-bold text-ink"
                      : `font-mono text-[12px] ${cell.inMonth ? "text-white/50" : "text-white/20"}`
                  }
                >
                  {String(cell.d).padStart(2, "0")}
                </div>
                <div className="mt-1 space-y-1">
                  {shown.map((ev) => {
                    const hasAmount = ev.amount_clp !== null && ev.amount_clp > 0;
                    const tone = payTone(ev.payment_status, hasAmount);
                    return (
                      <Link
                        key={ev.id}
                        href={`/calendario/${ev.id}/evento`}
                        className="flex items-center gap-1.5 rounded px-1.5 py-1 transition-[filter] hover:brightness-110"
                        style={{ background: "rgba(255,255,255,.04)" }}
                        title={ev.title}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: TONE_DOT[tone] }}
                          aria-hidden="true"
                        />
                        <span className="text-[11px] leading-none truncate hidden sm:block text-white/75">
                          {ev.title}
                        </span>
                      </Link>
                    );
                  })}
                  {extra > 0 && (
                    <div className="font-mono text-[9px] text-white/30 px-1.5">+{extra} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      {/* Leyenda (mismos tonos del Badge) + total del mes */}
      <div className="flex flex-wrap items-center gap-2 mt-3 px-1">
        <Badge tone="up">Pagado</Badge>
        <Badge tone="warn">Pendiente</Badge>
        <Badge tone="info">Parcial</Badge>
        <Badge tone="neutral">Otro evento</Badge>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.04em] text-white/35">
          {monthEventCount} {monthEventCount === 1 ? "evento" : "eventos"} este mes
        </span>
      </div>
    </section>
  );
}
