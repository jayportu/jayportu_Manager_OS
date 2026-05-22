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
 */
export function TrackBeacon({ userId, event }: TrackBeaconProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        event,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
      keepalive: true,
    }).catch(() => {
      // Silently ignore tracking failures
    });
  }, [userId, event]);

  return null;
}
