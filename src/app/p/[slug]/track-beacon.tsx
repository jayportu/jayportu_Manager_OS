"use client";

import { useEffect, useRef } from "react";
import type { PresskitEventType } from "@/types/database";

interface TrackBeaconProps {
  userId: string;
  event: PresskitEventType;
}

/**
 * Dispara una sola vez por montaje un POST a /api/track con el evento.
 * Usado para registrar "view" al abrir el press kit.
 *
 * Si la URL trae UTMs (utm_source, utm_medium, utm_content, utm_campaign),
 * los lee del query string y los manda como `metadata`. Esto permite saber
 * de dónde llegó cada visita (IG bio, WhatsApp, flyer QR, etc.) — los
 * presets están en /press-kit/share-tools.tsx.
 */
export function TrackBeacon({ userId, event }: TrackBeaconProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    // Capturar UTMs si vienen en el URL (window solo existe en browser)
    const metadata: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      for (const k of [
        "utm_source",
        "utm_medium",
        "utm_content",
        "utm_campaign",
      ]) {
        const v = sp.get(k);
        if (v) metadata[k] = v;
      }
    }

    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        event,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      }),
      keepalive: true,
    }).catch(() => {
      // Silently ignore tracking failures
    });
  }, [userId, event]);

  return null;
}
