/**
 * Lógica pura de la vista Cobros (agrupación + aging). Sin server-only ni
 * acceso a datos: solo transforma filas ya traídas. Aislado para poder
 * razonarlo y reusarlo sin arrastrar Supabase.
 */
import type { CalendarEventRow } from "@/lib/calendar/types";
import { santiagoDay, santiagoToday } from "@/lib/tz";

export type CobrosRange = "all" | "year" | "month";

export interface CobrosResult {
  /** Pendiente + parcial + (con monto pero estado 'none'). Orden: más viejo primero. */
  porCobrar: CalendarEventRow[];
  /** Pagados. Orden: más reciente primero. */
  cobrado: CalendarEventRow[];
  totalPorCobrar: number;
  totalCobrado: number;
  venuesDeben: number;
}

export function groupCobros(rows: CalendarEventRow[]): CobrosResult {
  const cobrado = rows.filter((r) => r.payment_status === "paid");
  // Todo lo que NO está pagado y llegó hasta acá tiene plata registrada
  // (la query filtra amount_clp>0 OR payment_status!='none').
  const porCobrar = rows.filter((r) => r.payment_status !== "paid");
  const sum = (list: CalendarEventRow[]) =>
    list.reduce((s, r) => s + (r.amount_clp ?? 0), 0);
  const byStartAsc = (a: CalendarEventRow, b: CalendarEventRow) =>
    a.start_at < b.start_at ? -1 : a.start_at > b.start_at ? 1 : 0;
  const byStartDesc = (a: CalendarEventRow, b: CalendarEventRow) =>
    a.start_at < b.start_at ? 1 : a.start_at > b.start_at ? -1 : 0;
  return {
    porCobrar: [...porCobrar].sort(byStartAsc),
    cobrado: [...cobrado].sort(byStartDesc),
    totalPorCobrar: sum(porCobrar),
    totalCobrado: sum(cobrado),
    venuesDeben: porCobrar.length,
  };
}

/**
 * Días vencidos en días-calendario de Santiago. `null` si el evento es hoy o
 * futuro (no está "vencido"). Compara medianoches de Santiago para evitar el
 * drift por horas/DST.
 */
export function daysOverdue(startISO: string, now: Date = new Date()): number | null {
  const start = Date.parse(`${santiagoDay(startISO)}T00:00:00Z`);
  const today = Date.parse(`${santiagoToday(now)}T00:00:00Z`);
  if (Number.isNaN(start) || start >= today) return null;
  return Math.round((today - start) / 86_400_000);
}

export interface ProyectadoMes {
  key: string; // "YYYY-MM"
  monthLabel: string; // "jul 26"
  total: number;
  count: number;
}

export interface ProyectadoResult {
  total: number;
  count: number;
  byMonth: ProyectadoMes[]; // meses futuros, ascendente
}

/** Vista completa de Cobros = buckets de cobro + proyección futura. */
export interface CobrosData extends CobrosResult {
  proyectado: ProyectadoResult;
}

/**
 * Suma los fees de gigs con fecha ≥ hoy (Santiago) y monto > 0, sin importar
 * payment_status ("lo que tengo agendado por ganar"), agrupado por mes.
 */
export function projectFuture(
  rows: CalendarEventRow[],
  now: Date = new Date()
): ProyectadoResult {
  const today = santiagoToday(now); // "YYYY-MM-DD"
  const futuros = rows.filter(
    (r) => (r.amount_clp ?? 0) > 0 && santiagoDay(r.start_at) >= today
  );
  const map = new Map<string, { total: number; count: number }>();
  for (const r of futuros) {
    const key = santiagoDay(r.start_at).slice(0, 7); // "YYYY-MM"
    const cur = map.get(key) ?? { total: 0, count: 0 };
    cur.total += r.amount_clp ?? 0;
    cur.count += 1;
    map.set(key, cur);
  }
  const byMonth: ProyectadoMes[] = [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([key, v]) => ({
      key,
      monthLabel: new Date(`${key}-01T12:00:00Z`).toLocaleDateString("es-CL", {
        month: "short",
        year: "2-digit",
        timeZone: "America/Santiago",
      }),
      total: v.total,
      count: v.count,
    }));
  return {
    total: futuros.reduce((s, r) => s + (r.amount_clp ?? 0), 0),
    count: futuros.length,
    byMonth,
  };
}
