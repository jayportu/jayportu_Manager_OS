"use client";

import type { PresskitEventType } from "@/types/database";
import { useEffect, useState } from "react";
import { normalizeUrl } from "@/lib/format";

/**
 * SoundCloud embed iframe.
 * Acepta la URL de un user o de un track/playlist.
 */
export function SoundcloudEmbed({
  url,
  userId,
  onClickEvent,
}: {
  url: string;
  userId: string;
  onClickEvent: PresskitEventType;
}) {
  const [tracked, setTracked] = useState(false);
  // URL bien formada pero cuenta/track inexistente en SoundCloud: el widget
  // renderiza un player vacío (caja en blanco) sin avisar. Verificamos con el
  // oEmbed público; SOLO un 4xx explícito degrada a link — si la red o CORS
  // fallan, conservamos el player (peor falso negativo que falso positivo).
  const [dead, setDead] = useState(false);

  useEffect(() => {
    // Trackeamos cuando se renderiza (intención de escuchar)
    if (tracked) return;
    setTracked(true);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event: onClickEvent }),
      keepalive: true,
    }).catch(() => {});
  }, [tracked, userId, onClickEvent]);

  // Mucha data vieja tiene URLs rotas (sin protocolo, share link pegado dos
  // veces, o un nombre con espacios en vez de handle). cleanSoundcloud repara
  // lo reparable y separa "embebible" (player) de "clickeable" (link).
  const { embed, link } = cleanSoundcloud(url);

  useEffect(() => {
    if (!embed) return;
    let cancelled = false;
    fetch(
      `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(embed)}`
    )
      .then((res) => {
        if (!cancelled && res.status >= 400 && res.status < 500) setDead(true);
      })
      .catch(() => {
        /* CORS/red: sin señal clara, mantener el player */
      });
    return () => {
      cancelled = true;
    };
  }, [embed]);

  if (!embed || dead) {
    // Degradación elegante: link simple en vez de un player con "error".
    if (!link) return null;
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-lg border border-border bg-bg-panel hover:border-accent/30 transition-colors text-center"
      >
        <span className="text-sm text-fg-muted">Ver en SoundCloud →</span>
      </a>
    );
  }

  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    embed
  )}&color=%23E85A0C&inverse=true&auto_play=false&show_user=true&hide_related=true`;

  return (
    <div className="rounded-lg overflow-hidden border border-border bg-bg-panel">
      <iframe
        width="100%"
        height="166"
        scrolling="no"
        frameBorder="no"
        allow="autoplay"
        src={embedUrl}
        title="SoundCloud player"
      />
    </div>
  );
}

/**
 * Limpia una URL de SoundCloud guardada (a menudo sucia).
 * - "soundcloud.com/https://soundcloud.com/foo" (pegado doble) → última URL
 * - sin protocolo → normalizeUrl
 * Devuelve { embed, link }:
 *   - link: URL clickeable si el host es soundcloud (aunque tenga espacios).
 *   - embed: igual a link PERO solo si el path no tiene espacios y no es vacío
 *     (el player muestra "error" con un path inválido como "/NICO VILLEGAS").
 */
function cleanSoundcloud(raw: string): {
  embed: string | null;
  link: string | null;
} {
  let s = (raw ?? "").trim();
  if (!s) return { embed: null, link: null };
  // Doble-paste: si hay un "http" más adentro, quedarse con la última URL.
  const lastHttp = s.lastIndexOf("http");
  if (lastHttp > 0) s = s.slice(lastHttp);
  s = normalizeUrl(s);
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return { embed: null, link: null };
  }
  if (!/(^|\.)soundcloud\.com$/i.test(u.hostname)) {
    return { embed: null, link: null };
  }
  const link = u.toString();
  const path = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, "");
  const embed = path.length > 0 && !/\s/.test(path) ? link : null;
  return { embed, link };
}

/**
 * YouTube embed.
 * Acepta URL de video, canal o playlist. Extrae el videoID si encuentra.
 */
export function YoutubeEmbed({
  url,
  userId,
  onClickEvent,
}: {
  url: string;
  userId: string;
  onClickEvent: PresskitEventType;
}) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    if (tracked) return;
    setTracked(true);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event: onClickEvent }),
      keepalive: true,
    }).catch(() => {});
  }, [tracked, userId, onClickEvent]);

  const safeUrl = normalizeUrl(url);
  const embedSrc = youtubeEmbedSrc(safeUrl);

  if (embedSrc) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden border border-border bg-bg-panel">
        <iframe
          width="100%"
          height="100%"
          src={embedSrc}
          title="YouTube video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback (URL de canal sin video/playlist embebible): botón claro en vez
  // de un link de texto, para que se note que es accionable.
  if (!safeUrl) return null;
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-border bg-orange text-ink font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-ink hover:text-orange transition-colors"
    >
      <span aria-hidden="true">▶</span> Ver canal en YouTube
    </a>
  );
}

/**
 * Devuelve el src del iframe de YouTube reproducible para una URL, o null si
 * no hay nada que reproducir (ej. link de canal).
 * Soporta video suelto, video dentro de playlist, playlist completa y lives.
 */
function youtubeEmbedSrc(url: string): string | null {
  if (!url) return null;
  const videoId = extractYouTubeVideoId(url);
  const listId = extractYouTubePlaylistId(url);

  // Video (con o sin playlist asociada) → reproduce el video.
  if (videoId) {
    return (
      `https://www.youtube.com/embed/${videoId}` +
      (listId ? `?list=${encodeURIComponent(listId)}` : "")
    );
  }
  // Playlist sin video puntual → reproduce la playlist como serie.
  // Solo prefijos de playlists reales (PL/UU/OL/FL/LL); listas "radio" (RD…)
  // no embeben bien, así que caen al botón.
  if (listId && /^(PL|UU|OL|FL|LL)/.test(listId)) {
    return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(
      listId
    )}`;
  }
  return null;
}

function extractYouTubeVideoId(url: string): string | null {
  // Soporta: youtu.be/ID, watch?v=ID, /embed/ID, /shorts/ID, /live/ID
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?(?:[^#]*&)?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractYouTubePlaylistId(url: string): string | null {
  const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Spotify embed. Acepta URL (open.spotify.com/...) o URI (spotify:track:ID)
 * de track, álbum, playlist, artista, episodio o show. Si no reconoce nada
 * embebible, degrada a un botón link.
 */
export function SpotifyEmbed({
  url,
  userId,
  onClickEvent,
}: {
  url: string;
  userId: string;
  onClickEvent: PresskitEventType;
}) {
  const [tracked, setTracked] = useState(false);
  useEffect(() => {
    if (tracked) return;
    setTracked(true);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event: onClickEvent }),
      keepalive: true,
    }).catch(() => {});
  }, [tracked, userId, onClickEvent]);

  const info = spotifyEmbedInfo(url);

  if (!info) {
    const link = normalizeUrl(url);
    if (!link) return null;
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-border bg-orange text-ink font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-ink hover:text-orange transition-colors"
      >
        Escuchar en Spotify →
      </a>
    );
  }

  // Track/episodio: player compacto. Álbum/playlist/artista/show: alto completo.
  const height = info.type === "track" || info.type === "episode" ? 152 : 352;

  return (
    <iframe
      src={`https://open.spotify.com/embed/${info.type}/${info.id}`}
      width="100%"
      height={height}
      style={{ borderRadius: 12 }}
      frameBorder="0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify player"
    />
  );
}

function spotifyEmbedInfo(
  raw: string
): { type: string; id: string } | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  // URI: spotify:track:ID
  const uri = s.match(
    /spotify:(track|album|playlist|artist|episode|show):([a-zA-Z0-9]+)/i
  );
  if (uri) return { type: uri[1].toLowerCase(), id: uri[2] };
  try {
    const u = new URL(normalizeUrl(s));
    if (!/(^|\.)spotify\.com$/i.test(u.hostname)) return null;
    // Soporta prefijo de locale: /intl-es/track/ID
    const m = u.pathname.match(
      /\/(?:intl-[a-z]{2}\/)?(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/i
    );
    if (m) return { type: m[1].toLowerCase(), id: m[2] };
    return null;
  } catch {
    return null;
  }
}

/**
 * Mixcloud embed. Arma el widget a partir del path del show/mix.
 */
export function MixcloudEmbed({
  url,
  userId,
  onClickEvent,
}: {
  url: string;
  userId: string;
  onClickEvent: PresskitEventType;
}) {
  const [tracked, setTracked] = useState(false);
  useEffect(() => {
    if (tracked) return;
    setTracked(true);
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, event: onClickEvent }),
      keepalive: true,
    }).catch(() => {});
  }, [tracked, userId, onClickEvent]);

  const feed = mixcloudFeed(url);
  if (!feed) {
    const link = normalizeUrl(url);
    return link ? (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-lg border border-border bg-bg-panel hover:border-accent/30 transition-colors text-center"
      >
        <span className="text-sm text-fg-muted">Escuchar en Mixcloud →</span>
      </a>
    ) : null;
  }
  const embedUrl = `https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=${encodeURIComponent(
    feed
  )}`;
  return (
    <div className="rounded-lg overflow-hidden border border-border bg-bg-panel">
      <iframe
        width="100%"
        height="120"
        frameBorder="0"
        allow="autoplay"
        src={embedUrl}
        title="Mixcloud player"
      />
    </div>
  );
}

function mixcloudFeed(url: string): string | null {
  try {
    const u = new URL(normalizeUrl(url));
    if (!/(^|\.)mixcloud\.com$/i.test(u.hostname)) return null;
    const path = u.pathname;
    if (!path || path === "/") return null;
    return path;
  } catch {
    return null;
  }
}

/**
 * Beatport: player oficial embebido (embed.beatport.com). Carga client-side,
 * así que NO lo afecta el Cloudflare que bloquea el scraping server-side.
 * El DJ pega el link del track/release; extraemos id + tipo. Iframe puro
 * (sin tracking por-render para no inflar; el botón del artista ya trackea).
 */
export function BeatportEmbed({ url }: { url: string }) {
  const info = beatportEmbedInfo(url);
  if (!info) {
    const link = normalizeUrl(url);
    if (!link || !/beatport\.com/i.test(link)) return null;
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="block p-4 rounded-lg border border-border bg-bg-panel hover:border-accent/30 transition-colors text-center"
      >
        <span className="text-sm text-fg-muted">Ver en Beatport →</span>
      </a>
    );
  }
  const height = info.type === "track" ? 88 : 300;
  return (
    <iframe
      src={`https://embed.beatport.com/?id=${info.id}&type=${info.type}`}
      width="100%"
      height={height}
      frameBorder="0"
      loading="lazy"
      title="Beatport player"
      className="block rounded-lg overflow-hidden border border-border"
    />
  );
}

function beatportEmbedInfo(raw: string): { id: string; type: string } | null {
  if (!raw) return null;
  // .../track/slug/123  ·  .../release/slug/123  ·  .../chart/slug/123 (+ /es/ locale)
  const m = raw.match(
    /beatport\.com\/(?:[a-z]{2}\/)?(track|release|chart)\/[^/]+\/(\d+)/i
  );
  return m ? { type: m[1].toLowerCase(), id: m[2] } : null;
}

/**
 * Set destacado (Fase 1 · 1B): detecta la plataforma por la URL y embebe
 * SoundCloud / Mixcloud / YouTube. Fallback a link si no la reconoce.
 */
export function SetEmbed({ url, userId }: { url: string; userId: string }) {
  const u = normalizeUrl(url);
  if (!u) return null;
  if (/soundcloud\.com/i.test(u)) {
    return (
      <SoundcloudEmbed url={u} userId={userId} onClickEvent="click_soundcloud" />
    );
  }
  if (/mixcloud\.com/i.test(u)) {
    return (
      <MixcloudEmbed url={u} userId={userId} onClickEvent="click_soundcloud" />
    );
  }
  if (/youtu\.?be/i.test(u)) {
    return <YoutubeEmbed url={u} userId={userId} onClickEvent="click_youtube" />;
  }
  return (
    <a
      href={u}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border border-border bg-bg-panel hover:border-accent/30 transition-colors text-center"
    >
      <span className="text-sm text-fg-muted">Escuchar set →</span>
    </a>
  );
}
