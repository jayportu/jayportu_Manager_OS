/**
 * Spotify Web API — lectura de stats públicas de un artista.
 *
 * Usa el flujo Client Credentials (app-to-app, sin usuario): pedimos un
 * token de app con CLIENT_ID + CLIENT_SECRET y con eso leemos data pública
 * del artista (followers, popularity, géneros). No requiere OAuth de usuario
 * ni review de Spotify.
 *
 * Requiere SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET en env.
 *
 * Setup en https://developer.spotify.com/dashboard (gratis, sin review):
 *   1. Create app → cualquier nombre/descr, redirect URI dummy
 *   2. Copiar Client ID + Client Secret
 *   3. Guardarlos como secrets SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET
 *      en Vercel + .env.local
 */

export interface SpotifyArtist {
  external_id: string;   // id base62 del artista
  name: string;          // "Jay Portu"
  followers: number;     // followers en Spotify
  popularity: number;    // 0-100, índice de popularidad de Spotify
  genres: string[];      // ["tech house", "latin electronic"]
  url: string;           // https://open.spotify.com/artist/{id}
  image_url: string | null;
}

interface SpotifyTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface SpotifyArtistResponse {
  id?: string;
  name?: string;
  followers?: { total?: number };
  popularity?: number;
  genres?: string[];
  external_urls?: { spotify?: string };
  images?: { url?: string }[];
  error?: { status: number; message: string };
}

/** ¿Están las 2 credenciales de Spotify configuradas? */
export function isSpotifyConfigured(): boolean {
  return !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET;
}

/**
 * Extrae el id base62 (22 chars) del artista desde distintos formatos:
 *   "https://open.spotify.com/artist/{id}"            → {id}
 *   "https://open.spotify.com/intl-es/artist/{id}?..."→ {id} (con locale/query)
 *   "spotify:artist:{id}"                             → {id}
 *   "{id}" (22 chars base62 pelado)                   → {id}
 * Devuelve null si es un link de user/playlist/album/track/otro.
 */
export function parseSpotifyArtistId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  const idPattern = /^[A-Za-z0-9]{22}$/;

  // id base62 pelado
  if (idPattern.test(s)) return s;

  // URI: spotify:artist:{id}
  const uriMatch = s.match(/^spotify:artist:([A-Za-z0-9]{22})$/);
  if (uriMatch) return uriMatch[1];

  // URL: open.spotify.com/.../artist/{id} (con prefijo opcional /intl-es/)
  const urlMatch = s.match(
    /open\.spotify\.com\/(?:[a-z-]+\/)?artist\/([A-Za-z0-9]{22})(?:[/?#]|$)/i
  );
  if (urlMatch) return urlMatch[1];

  // Cualquier otro link de Spotify (user/playlist/album/track/...) → no válido
  return null;
}

/**
 * Fetch + parse del artista de Spotify.
 * Lanza Error si faltan credenciales, si el link es inválido, si el artista
 * no existe o si la API devuelve error.
 */
export async function fetchSpotifyArtist(
  idOrUrl: string
): Promise<SpotifyArtist> {
  if (!isSpotifyConfigured()) {
    throw new Error(
      "Spotify no está configurado. Crea una app en https://developer.spotify.com/dashboard (gratis) y agrega SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET como env vars."
    );
  }

  const artistId = parseSpotifyArtistId(idOrUrl);
  if (!artistId) {
    throw new Error(
      `Link de artista de Spotify inválido: "${idOrUrl}". Usa el link del perfil del artista (open.spotify.com/artist/…).`
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID as string;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET as string;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  // ─── 1. Token de app (client_credentials) ──────────────────────────
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!tokenRes.ok) {
    let detail = "";
    try {
      const body = (await tokenRes.json()) as SpotifyTokenResponse;
      detail = body.error_description || body.error || "";
    } catch {
      // ignore
    }
    throw new Error(
      `No pudimos autenticar con Spotify (HTTP ${tokenRes.status})${
        detail ? ` — ${detail}` : ""
      }. Revisa SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET.`
    );
  }

  const tokenData = (await tokenRes.json()) as SpotifyTokenResponse;
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    throw new Error("Spotify no devolvió un access_token válido.");
  }

  // ─── 2. Datos del artista ───────────────────────────────────────────
  const res = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (res.status === 404) {
    throw new Error("No encontramos ese artista en Spotify.");
  }

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as SpotifyArtistResponse;
      detail = body.error?.message ? ` — ${body.error.message}` : "";
    } catch {
      // ignore
    }
    throw new Error(`Spotify API HTTP ${res.status}${detail}`);
  }

  const data = (await res.json()) as SpotifyArtistResponse;
  if (data.error) {
    throw new Error(`Spotify API: ${data.error.message}`);
  }

  return {
    external_id: data.id || artistId,
    name: data.name || "(sin nombre)",
    followers: data.followers?.total ?? 0,
    popularity: data.popularity ?? 0,
    genres: data.genres ?? [],
    url:
      data.external_urls?.spotify ||
      `https://open.spotify.com/artist/${artistId}`,
    image_url: data.images?.[0]?.url ?? null,
  };
}
