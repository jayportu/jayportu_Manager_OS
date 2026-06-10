/**
 * Sentry — monitoreo de errores en el browser.
 *
 * DORMIDO sin NEXT_PUBLIC_SENTRY_DSN: no se inicializa → cero overhead.
 * Next 15 carga este archivo automáticamente en el cliente.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
  });
}

// Instrumentación de navegación del App Router. No-op si Sentry está dormido.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
