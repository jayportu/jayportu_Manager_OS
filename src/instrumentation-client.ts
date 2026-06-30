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
    // Ruido del navegador in-app de Instagram/Meta en iOS: su JS inyectado
    // llama a window.webkit.messageHandlers (que no siempre existe) al salir
    // de la página. No es código nuestro y no afecta al usuario. Como /beta
    // recibe casi todo su tráfico desde IG, estos falsos positivos taparían
    // errores reales.
    ignoreErrors: [
      "window.webkit.messageHandlers",
      "sendDataToNative",
      "sendPageHideMessage",
    ],
  });
}

// Instrumentación de navegación del App Router. No-op si Sentry está dormido.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
