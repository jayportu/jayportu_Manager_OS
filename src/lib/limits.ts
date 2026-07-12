/**
 * F0 · Límites antiabuso centralizados y configurables por env.
 *
 * Defaults conservadores (supuesto A3 del plan de apertura de bookers). Se
 * afinan con datos de la cohorte founding cambiando una variable de entorno,
 * sin tocar código ni redeployar lógica.
 *
 * Módulo PURO (sin "server-only") para poder testear `envInt` con node --test.
 * Solo lee nombres de env NO secretos (números de cuota); si se importara por
 * error en un bundle de cliente, `process.env` no los expone y cae al default
 * (no hay fuga de datos).
 */

/** Parsea un entero positivo desde env; cae al fallback si falta o es inválido. */
export function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Máximo de convocatorias abiertas simultáneas por booker. */
export function bookerMaxOpenGigs(): number {
  return envInt("BOOKER_MAX_OPEN_GIGS", 5);
}

/** Máximo de convocatorias creadas por un booker en las últimas 24h. */
export function bookerGigCreatePerDay(): number {
  return envInt("BOOKER_GIG_CREATE_PER_DAY", 10);
}

/** Máximo de postulaciones que un DJ puede enviar en las últimas 24h. */
export function djApplyPerDay(): number {
  return envInt("DJ_APPLY_PER_DAY", 30);
}

/** Máximo de consultas de contacto de DJ por booker en 10 min (anti-burst). */
export function bookerContactPer10Min(): number {
  return envInt("BOOKER_CONTACT_PER_10MIN", 20);
}

/** Máximo de DJs DISTINTOS cuyo contacto un booker puede revelar en 24h. */
export function bookerContactDistinctPerDay(): number {
  return envInt("BOOKER_CONTACT_DISTINCT_PER_DAY", 60);
}
