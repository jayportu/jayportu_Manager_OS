/**
 * Scopes Google que pide la app. Lista única para todo lo Google-related.
 *
 * Se mantiene fuera de oauth.ts (que es server-only por hacer fetch a
 * APIs) para que client components — como el botón "Continuar con
 * Google" en /login — puedan importarla sin romper el build.
 *
 * IMPORTANTE — solo scopes SENSIBLES (no restringidos):
 *   `gmail.send` y `calendar.events` son scopes "sensibles". NO pedimos
 *   `gmail.readonly` ni `gmail.compose` (que son RESTRINGIDOS y exigen la
 *   auditoría CASA, paga). Esto mantiene la app dentro del camino de
 *   verificación GRATIS de Google y, de paso, es más privado: DROP. solo
 *   envía correos, nunca lee la bandeja del DJ.
 *   → Si algún día se vuelve a pedir un scope de lectura, vuelve la
 *     advertencia "app no verificada" + el requisito de CASA.
 *
 * Cuando se agregan nuevos scopes, los users existentes ven el banner
 * proactivo de reconexión (ver components/gmail/google-scope-banner.tsx).
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  // Gmail — SOLO enviar (sensible, no restringido)
  "https://www.googleapis.com/auth/gmail.send",
  // Calendar (sensible)
  "https://www.googleapis.com/auth/calendar.events",
];
