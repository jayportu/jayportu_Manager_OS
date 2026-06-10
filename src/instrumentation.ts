/**
 * Sentry — monitoreo de errores server (Node + Edge runtimes).
 *
 * DORMIDO sin DSN: si no hay SENTRY_DSN/NEXT_PUBLIC_SENTRY_DSN, `register()`
 * retorna sin inicializar nada → cero overhead, idéntico a no tener Sentry.
 * Se activa solo al poner el DSN en Vercel (ver .env.example).
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

export async function register() {
  if (!DSN) return; // dormido
  if (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge"
  ) {
    Sentry.init({
      dsn: DSN,
      // Solo errores por ahora (sin performance) para cuidar la cuota free.
      tracesSampleRate: 0,
      // No mandar IP/cookies/headers con datos del usuario (privacidad).
      sendDefaultPii: false,
      environment: process.env.VERCEL_ENV || "development",
    });
  }
}

// Hook de Next 15 para reportar errores de Server Components / route handlers.
// Si Sentry no está inicializado (dormido), es un no-op seguro.
export const onRequestError = Sentry.captureRequestError;
