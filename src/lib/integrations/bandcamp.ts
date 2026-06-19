/**
 * SEO/Capa-2 #3 — Auto-discografía de Bandcamp.
 *
 * Lee la página /music del artista (HTTP 200, sin Cloudflare) y extrae sus
 * releases (título, link, carátula) para mostrarlos en el press kit, sin que
 * el DJ tenga que cargarlos a mano. Best-effort: si algo falla, devuelve [].
 *
 * Seguridad (SSRF): solo se permite fetch a hosts *.bandcamp.com.
 * Beatport NO se hace acá: está detrás de Cloudflare (403 server-side).
 */
import "server-only";

export interface BandcampRelease {
  title: string;
  url: string;
  artUrl: string;
}

/** Origen https://artista.bandcamp.com si la URL es válida; null si no. */
function bandcampOrigin(raw: string): string | null {
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (!/(^|\.)bandcamp\.com$/i.test(u.hostname)) return null;
    return `https://${u.hostname}`;
  } catch {
    return null;
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/**
 * Devuelve los releases del artista (máx `max`). Cachea el HTML 1 día.
 */
export async function getBandcampReleases(
  rawUrl: string,
  max = 12
): Promise<BandcampRelease[]> {
  const origin = bandcampOrigin(rawUrl);
  if (!origin) return [];

  let html = "";
  try {
    const res = await fetch(`${origin}/music`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DropgigsBot/1.0; +https://dropgigs.com)",
      },
      next: { revalidate: 86400 }, // 1 día
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch {
    return [];
  }

  const releases: BandcampRelease[] = [];
  const seen = new Set<string>();
  // Cada release es un <li ... class="...music-grid-item...">…</li>
  const liRe = /<li\b[^>]*music-grid-item[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = liRe.exec(html)) !== null && releases.length < max) {
    const block = m[1];
    const href = (block.match(/<a\s+href="([^"]+)"/) || [])[1];
    if (!href) continue;

    const artMatch = block.match(
      /<img[^>]+src="(https:\/\/f4\.bcbits\.com\/img\/[^"]+)"/
    );
    let artUrl = artMatch ? artMatch[1] : "";
    if (artUrl.includes("blank.gif")) artUrl = "";

    const titleMatch = block.match(/<p[^>]*class="title"[^>]*>\s*([^<]+?)\s*</);
    const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : "";
    if (!title) continue;

    const url = href.startsWith("http") ? href : `${origin}${href}`;
    if (seen.has(url)) continue;
    seen.add(url);
    releases.push({ title, url, artUrl });
  }
  return releases;
}
