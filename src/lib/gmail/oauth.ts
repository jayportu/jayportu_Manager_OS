/**
 * Google OAuth 2.0 flow para Gmail.
 *
 * Por qué OAuth manual (no Supabase Auth Google provider):
 *   Supabase Auth con Google solo guarda la sesión, no permite acceso
 *   API continuo (refresh tokens). Para llamar Gmail API necesitamos
 *   manejo manual de tokens.
 *
 * Scopes que pedimos:
 *   - gmail.readonly: leer hilos + mensajes
 *   - gmail.compose: crear borradores
 *   - gmail.send: enviar mensajes (requerirá confirmación de Jaime)
 */

export const GOOGLE_OAUTH_AUTH_URL =
  "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_USERINFO_URL =
  "https://www.googleapis.com/oauth2/v2/userinfo";

/**
 * Scopes que pedimos. Cubre Gmail + Calendar en un solo OAuth flow.
 * Cuando se agregan nuevos scopes, el usuario tiene que RECONECTAR.
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

// Backward compat
export const GMAIL_SCOPES = GOOGLE_SCOPES;

/**
 * Detecta si una conexión existente fue otorgada con menos scopes que
 * los que la versión actual de la app requiere. Cuando agregamos un
 * scope nuevo (ej: Calendar, Drive, Contacts) sin esto, el user no se
 * entera hasta que intenta usar la feature y la API tira 403.
 *
 * Devuelve la lista de scopes faltantes. Vacío = la conexión está al día.
 *
 * @param grantedScopeStr - string con scopes separados por espacio,
 *   tal como lo guarda gmail_connections.scope (proviene del response
 *   de Google al exchange/refresh).
 */
export function getMissingScopes(grantedScopeStr: string | null | undefined): string[] {
  if (!grantedScopeStr) return [...GOOGLE_SCOPES];
  const granted = new Set(grantedScopeStr.split(/\s+/).filter(Boolean));
  return GOOGLE_SCOPES.filter((s) => !granted.has(s));
}

/** Devuelve labels humanos para los scopes faltantes (para banner). */
export function describeMissingScopes(missing: string[]): string[] {
  const map: Record<string, string> = {
    "https://www.googleapis.com/auth/userinfo.email": "tu email",
    "https://www.googleapis.com/auth/gmail.readonly": "leer Gmail",
    "https://www.googleapis.com/auth/gmail.compose": "componer borradores",
    "https://www.googleapis.com/auth/gmail.send": "enviar Gmail",
    "https://www.googleapis.com/auth/calendar.events": "Google Calendar",
  };
  return missing.map((s) => map[s] || s.split("/").pop() || s);
}

export function getRedirectUri(): string {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://dropgigs.com";
  return `${base}/api/gmail/callback`;
}

export function buildAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID no configurado");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline", // refresh_token
    prompt: "consent",       // forzar refresh_token siempre
    include_granted_scopes: "true",
    state,
  });
  return `${GOOGLE_OAUTH_AUTH_URL}?${params.toString()}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/SECRET no configurados");
  }

  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Token exchange falló: ${res.status} ${txt}`);
  }
  return (await res.json()) as GoogleTokens;
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<Pick<GoogleTokens, "access_token" | "expires_in" | "scope" | "token_type">> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID/SECRET no configurados");
  }

  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Refresh falló: ${res.status} ${txt}`);
  }
  return (await res.json()) as Pick<
    GoogleTokens,
    "access_token" | "expires_in" | "scope" | "token_type"
  >;
}

export async function getGoogleUserInfo(
  accessToken: string
): Promise<{ email: string; name?: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("No se pudo obtener email del usuario");
  return (await res.json()) as { email: string; name?: string };
}
