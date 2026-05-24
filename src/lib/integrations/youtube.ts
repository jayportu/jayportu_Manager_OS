/**
 * YouTube Data API v3 — lectura de stats públicas de un canal.
 *
 * Usa API key (no OAuth) porque las stats del canal son data pública.
 * Cuota gratis: 10.000 unidades/día. channels.list cuesta 1 unidad, así
 * que tenemos margen sobrado para sync diario.
 *
 * Requiere YOUTUBE_API_KEY en env.
 *
 * Setup en Google Cloud Console (Jaime puede reusar el proyecto del
 * Sprint 6/Gmail):
 *   1. Habilitar "YouTube Data API v3" en el proyecto
 *   2. Credentials → Create credentials → API key
 *   3. Restringir la key a "YouTube Data API v3" (recomendado, no obligatorio)
 *   4. Guardar como secret YOUTUBE_API_KEY en Vercel + .env.local
 */

export interface YouTubeChannel {
  channel_id: string;          // UCxxxxxxxxxxxxxxxxxxxxxx
  handle: string | null;       // @JayPortu (puede ser null si no tiene)
  custom_url: string | null;   // @JayPortu o legacy /c/JayPortu
  title: string;               // "Jay Portu"
  description: string;
  country: string | null;
  published_at: string;        // ISO date de creación del canal
  subscriber_count: number;    // -1 si el canal lo tiene oculto
  video_count: number;
  view_count: number;          // views lifetime de todos los videos
  thumbnail_url: string | null;
}

interface YouTubeAPIChannel {
  id: string;
  snippet?: {
    title?: string;
    description?: string;
    customUrl?: string;
    country?: string;
    publishedAt?: string;
    thumbnails?: { high?: { url?: string } };
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
}

interface YouTubeAPIResponse {
  items?: YouTubeAPIChannel[];
  error?: { code: number; message: string };
}

/**
 * Normaliza diferentes formas de input a algo que la API entienda:
 *   "@JayPortu"                          → forHandle=@JayPortu
 *   "JayPortu"                           → forHandle=@JayPortu
 *   "UCxxxxxxxxxxxxxxxxxxxxxx"           → id=UC...
 *   "https://youtube.com/@JayPortu"      → forHandle=@JayPortu
 *   "https://youtube.com/channel/UCxxx"  → id=UCxxx
 *   "https://youtube.com/c/JayPortu"     → forUsername=JayPortu (legacy)
 *   "https://youtube.com/user/legacy"    → forUsername=legacy (legacy)
 */
export function normalizeYouTubeInput(input: string): {
  param: "id" | "forHandle" | "forUsername";
  value: string;
} {
  const s = input.trim();

  // Channel ID directo
  if (/^UC[A-Za-z0-9_-]{20,}$/.test(s)) {
    return { param: "id", value: s };
  }

  // URL forms
  const urlMatch = s.match(/(?:youtube\.com|youtu\.be)\/([^/?#]+)(?:\/([^/?#]+))?/i);
  if (urlMatch) {
    const first = urlMatch[1];
    const second = urlMatch[2];

    // /channel/UCxxx
    if (first.toLowerCase() === "channel" && second) {
      return { param: "id", value: second };
    }
    // /c/Name (legacy custom)
    if (first.toLowerCase() === "c" && second) {
      return { param: "forUsername", value: second };
    }
    // /user/Name (legacy username)
    if (first.toLowerCase() === "user" && second) {
      return { param: "forUsername", value: second };
    }
    // /@Handle
    if (first.startsWith("@")) {
      return { param: "forHandle", value: first };
    }
  }

  // @Handle directo
  if (s.startsWith("@")) {
    return { param: "forHandle", value: s };
  }

  // Solo el nombre — asumimos handle (más común post-2022)
  return { param: "forHandle", value: `@${s}` };
}

/**
 * Fetch + parse del canal de YouTube.
 * Lanza Error si la API key falta, si el canal no existe o si la API
 * devuelve error.
 */
export async function fetchYouTubeChannel(
  handleOrId: string
): Promise<YouTubeChannel> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "YOUTUBE_API_KEY no configurada. Crea una en Google Cloud Console (YouTube Data API v3) y agrégala como env var."
    );
  }

  const norm = normalizeYouTubeInput(handleOrId);
  if (!norm.value || norm.value.length > 100) {
    throw new Error(`Input inválido: "${handleOrId}"`);
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/channels");
  url.searchParams.set("part", "snippet,statistics");
  url.searchParams.set(norm.param, norm.value);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString(), {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as YouTubeAPIResponse;
      detail = body.error?.message ? ` — ${body.error.message}` : "";
    } catch {
      // ignore
    }
    throw new Error(`YouTube API HTTP ${res.status}${detail}`);
  }

  const data = (await res.json()) as YouTubeAPIResponse;
  if (data.error) {
    throw new Error(`YouTube API: ${data.error.message}`);
  }

  const items = data.items || [];
  if (items.length === 0) {
    throw new Error(
      `Canal no encontrado para "${handleOrId}". Verifica el handle/URL.`
    );
  }

  const ch = items[0];
  const stats = ch.statistics || {};
  const snip = ch.snippet || {};

  const subscriberCount = stats.hiddenSubscriberCount
    ? -1
    : parseInt(stats.subscriberCount || "0", 10);

  return {
    channel_id: ch.id,
    handle: snip.customUrl?.startsWith("@") ? snip.customUrl : null,
    custom_url: snip.customUrl ?? null,
    title: snip.title || "(sin título)",
    description: snip.description || "",
    country: snip.country ?? null,
    published_at: snip.publishedAt || "",
    subscriber_count: subscriberCount,
    video_count: parseInt(stats.videoCount || "0", 10),
    view_count: parseInt(stats.viewCount || "0", 10),
    thumbnail_url: snip.thumbnails?.high?.url ?? null,
  };
}
