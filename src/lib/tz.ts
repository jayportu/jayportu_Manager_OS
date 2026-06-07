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
