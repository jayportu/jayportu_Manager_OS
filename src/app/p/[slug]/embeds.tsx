"use client";

import type { PresskitEventType } from "@/types/database";
import { useEffect, useState } from "react";

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
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
    url
  )}&color=%23e8b923&inverse=true&auto_play=false&show_user=true&hide_related=true`;

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

  const videoId = extractYouTubeVideoId(url);

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

  // Fallback: link al canal
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border border-border bg-bg-panel hover:border-accent/30 transition-colors text-center"
    >
      <span className="text-sm text-fg-muted">Ver en YouTube →</span>
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
