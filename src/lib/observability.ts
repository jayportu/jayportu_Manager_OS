/**
 * Captura de errores de server actions hacia Sentry.
 *
 * Sentry ya está instrumentado (src/instrumentation.ts) pero los catch de las
 * actions solo devolvían `{ ok:false, error }` al cliente: el fallo nunca
 * llegaba a monitoreo. Este helper se llama desde los `err()`/`errResult()`
 * locales de cada actions.ts, así un solo punto instrumenta todos los catch
 * del archivo sin cambiar su contrato.
 *
 * No adjuntar PII en `context` (emails, tokens): Sentry corre con
 * sendDefaultPii: false y queremos mantener esa garantía.
 */
import * as Sentry from "@sentry/nextjs";

export function captureActionError(e: unknown, context?: Record<string, string>) {
  try {
    Sentry.captureException(e, context ? { extra: context } : undefined);
  } catch {
    // Sentry dormido (sin DSN) o fallo del SDK: nunca romper la action por telemetría.
  }
}
