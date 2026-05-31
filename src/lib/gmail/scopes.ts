/**
 * Scopes Google que pide la app. Lista única para todo lo Google-related.
 *
 * Se mantiene fuera de oauth.ts (que es server-only por hacer fetch a
 * APIs) para que client components — como el botón "Continuar con
 * Google" en /login — puedan importarla sin romper el build.
 *
 * Cuando se agregan nuevos scopes, los users existentes ven el banner
 * proactivo de reconexión (ver components/gmail/google-scope-banner.tsx).
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  // Gmail
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  // Calendar
  "https://www.googleapis.com/auth/calendar.events",
];
