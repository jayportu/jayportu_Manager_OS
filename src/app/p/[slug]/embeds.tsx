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

  if (!embed) {
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
  )}&color=%23e8b923&inverse=true&auto_play=false&show_user=true&hide_related=true`;

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
  const videoId = extractYouTubeVideoId(safeUrl);

  if (videoId) {
    return (
      <div className="aspect-video rounded-lg overflow-hidden border border-border bg-bg-panel">
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  // Fallback (URL de canal/playlist sin video embebible): botón claro en vez
  // de un link de texto, para que se note que es accionable.
  if (!safeUrl) return null;
  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center gap-2 h-12 rounded-lg border-2 border-ink bg-ink text-cream font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-orange hover:text-ink transition-colors"
    >
      <span aria-hidden="true">▶</span> Ver canal en YouTube
    </a>
  );
}

function extractYouTubeVideoId(url: string): string | null {
  // Soporta: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}
