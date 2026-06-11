/**
 * Helpers de zona horaria. La app asume hora de Chile (America/Santiago) para
 * mostrar gigs/eventos; Vercel corre en UTC. Estos helpers convierten una hora
 * de pared de Santiago al instante UTC correcto, manejando CLT/CLST (verano).
 */

/**
 * Devuelve el instante UTC (ISO) que en America/Santiago se lee como
 * `${dateStr}T${time}`. Robusto ante horario de verano.
 *
 * Ej: santiagoToUtcISO("2026-06-10", "22:00:00") → "2026-06-11T02:00:00.000Z"
 * (invierno, UTC-4). En verano (UTC-3) daría 01:00Z.
 */
export function santiagoToUtcISO(dateStr: string, time = "00:00:00"): string {
  // Instante "naive": interpretamos la hora de pared COMO SI fuera UTC.
  const naiveUtc = new Date(`${dateStr}T${time}Z`);
  // ¿Qué hora de pared muestra ese instante en Santiago? La diferencia entre
  // ese reading y el naive es el offset de Santiago para esa fecha.
  const sanWall = new Date(
    naiveUtc.toLocaleString("en-US", { timeZone: "America/Santiago" })
  );
  const offsetMs = naiveUtc.getTime() - sanWall.getTime();
  return new Date(naiveUtc.getTime() + offsetMs).toISOString();
}

/** Año y mes (1-12) vigentes según Santiago, no según el server (UTC). */
function santiagoYearMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")!.value),
    month: Number(parts.find((p) => p.type === "month")!.value),
  };
}

/**
 * Fecha de HOY en Santiago como "YYYY-MM-DD". Para comparar contra columnas de
 * fecha (disponibilidad, vencimientos) sin el off-by-one de usar la fecha UTC
 * del server cerca de medianoche de Chile.
 */
export function santiagoToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Día calendario (en Santiago) de un instante ISO, como "YYYY-MM-DD". */
export function santiagoDay(iso: string): string {
  return santiagoToday(new Date(iso));
}

/**
 * Instante UTC (ISO) del primer día del MES SIGUIENTE a las 00:00 en Santiago.
 * Cota superior (exclusiva) para ventanas mensuales en hora de Chile.
 */
export function santiagoNextMonthStartUtcISO(now: Date = new Date()): string {
  let { year, month } = santiagoYearMonth(now);
  month += 1;
  if (month === 13) {
    month = 1;
    year += 1;
  }
  return santiagoToUtcISO(`${year}-${String(month).padStart(2, "0")}-01`, "00:00:00");
}

/**
 * Instante UTC (ISO) del primer día del mes actual a las 00:00 en Santiago.
 * Para cupos mensuales (ej: tokens de pitch) que deben resetear a medianoche
 * de Chile, no a medianoche UTC del server.
 */
export function santiagoMonthStartUtcISO(now: Date = new Date()): string {
  // Año y mes vigentes SEGÚN Santiago (no según el server, que corre en UTC).
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return santiagoToUtcISO(`${year}-${month}-01`, "00:00:00");
}
