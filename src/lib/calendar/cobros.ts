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
