/**
 * Sentry — monitoreo de errores en el browser.
 *
 * DORMIDO sin NEXT_PUBLIC_SENTRY_DSN: no se inicializa → cero overhead.
 * Next 15 carga este archivo automáticamente en el cliente.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

/** Tipo estructural mínimo de un evento con stack (evita acoplar a nombres de tipos del SDK). */
type FrameLike = { filename?: string };
type EventLike = {
  exception?: { values?: { stacktrace?: { frames?: FrameLike[] } }[] };
};

/**
 * ¿El evento toca AL MENOS un frame de código NUESTRO?
 *
 * Nuestro bundle se sirve desde `/_next/…` (mismo origen). Los errores de
 * extensiones del navegador o de scripts anónimos inyectados por terceros
 * aparecen con frames `chrome-extension://…` o, peor, `<script>`/`<anonymous>`
 * sin URL de nuestro origen (justo lo que se vio en el TypeError de
 * `<script>:1:…` en la home: 0 frames nuestros). Si un error tiene stack pero
 * NINGÚN frame es nuestro, es ruido de terceros que el handler global de
 * `onunhandledrejection` captura y atribuye a la página — no es un bug de DROP.
 */
function hasFirstPartyFrame(event: EventLike): boolean {
  const values = event.exception?.values;
  if (!values?.length) return true; // sin stack (p.ej. mensajes) → no filtrar
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let sawFrame = false;
  for (const v of values) {
    for (const f of v.stacktrace?.frames ?? []) {
      sawFrame = true;
      const fn = f.filename || "";
      if (fn.includes("/_next/") || (origin && fn.startsWith(origin))) return true;
    }
  }
  return !sawFrame; // había frames y ninguno es nuestro → filtrar
}

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
    // Errores originados en extensiones del navegador: sus frames traen la URL
    // del propio addon. Código ajeno, sin impacto en el usuario.
    denyUrls: [
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      /^safari-(web-)?extension:\/\//i,
    ],
    // Descarta errores cuyo stack no toca NINGÚN frame de nuestro bundle
    // (scripts anónimos `<script>` de terceros/extensiones). Esto es lo que
    // tapaba issues reales con TypeErrors de `<script>:1:…` en producción.
    beforeSend(event) {
      return hasFirstPartyFrame(event) ? event : null;
    },
  });
}

// Instrumentación de navegación del App Router. No-op si Sentry está dormido.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
