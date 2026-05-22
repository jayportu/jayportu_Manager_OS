/**
 * SoundCloud scraper público.
 *
 * No usa API oficial (cerrada para nuevos devs desde 2019).
 * Fetch del HTML del perfil + parse del JSON inicial embebido.
 *
 * Frágil si SC cambia el markup — capturamos el error y lo guardamos
 * en platform_accounts.last_error para inspección.
 */

export interface SoundCloudProfile {
  username: string;          // handle (jay_portu)
  display_name: string;      // "JAY PORTU"
  full_name: string | null;
  followers_count: number;
  followings_count: number;
  track_count: number;
  playlist_count: number;
  likes_count: number;
  comments_count: number;
  verified: boolean;
  city: string | null;
  country_code: string | null;
  avatar_url: string | null;
  external_id: string | null; // id numérico interno de SC
}

/**
 * Normaliza un username/URL a handle limpio.
 *   "jay_portu"                      → "jay_portu"
 *   "https://soundcloud.com/jay_portu" → "jay_portu"
 *   "@jay_portu"                     → "jay_portu"
 */
export function normalizeSoundCloudHandle(input: string): string {
  let s = input.trim();
  s = s.replace(/^@/, "");
  const m = s.match(/soundcloud\.com\/([^/?#]+)/i);
  if (m) return m[1];
  return s;
}

/**
 * Extrae el primer match numérico de un campo del HTML.
 * SC embebe el perfil en window.__hydration o similar como JSON.
 */
function extractNumber(html: string, field: string): number | null {
  const re = new RegExp(`"${field}"\\s*:\\s*(\\d+)`);
  const m = html.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function extractString(html: string, field: string): string | null {
  // Busca "field":"valor" (escapes simples). SC usa JSON estándar.
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`);
  const m = html.match(re);
  if (!m) return null;
  try {
    return JSON.parse(`"${m[1]}"`);
  } catch {
    return m[1];
  }
}

function extractBool(html: string, field: string): boolean | null {
  const re = new RegExp(`"${field}"\\s*:\\s*(true|false)`);
  const m = html.match(re);
  return m ? m[1] === "true" : null;
}

/**
 * Fetch + parse de un perfil público.
 * Lanza Error si HTTP no-200 o si no se encuentra followers_count.
 */
export async function fetchSoundCloudProfile(
  handleOrUrl: string
): Promise<SoundCloudProfile> {
  const handle = normalizeSoundCloudHandle(handleOrUrl);
  if (!handle || !/^[a-zA-Z0-9_-]+$/.test(handle)) {
    throw new Error(`Username inválido: "${handle}"`);
  }

  const url = `https://soundcloud.com/${handle}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`SoundCloud devolvió HTTP ${res.status} para ${handle}`);
  }

  const html = await res.text();

  const followers = extractNumber(html, "followers_count");
  if (followers === null) {
    throw new Error(
      `No se encontró follower_count en HTML de ${handle} — quizás el perfil no existe o SC cambió el markup`
    );
  }

  const externalId = (() => {
    // Primer "id":N que aparezca después de "kind":"user" en el bloque del usuario
    const m = html.match(/"kind":"user"[^}]*"id"\s*:\s*(\d+)/);
    return m ? m[1] : null;
  })();

  return {
    username: extractString(html, "permalink") || handle,
    display_name: extractString(html, "username") || handle,
    full_name: extractString(html, "full_name"),
    followers_count: followers,
    followings_count: extractNumber(html, "followings_count") ?? 0,
    track_count: extractNumber(html, "track_count") ?? 0,
    playlist_count: extractNumber(html, "playlist_count") ?? 0,
    likes_count: extractNumber(html, "likes_count") ?? 0,
    comments_count: extractNumber(html, "comments_count") ?? 0,
    verified: extractBool(html, "verified") ?? false,
    city: extractString(html, "city"),
    country_code: extractString(html, "country_code"),
    avatar_url: extractString(html, "avatar_url"),
    external_id: externalId,
  };
}
