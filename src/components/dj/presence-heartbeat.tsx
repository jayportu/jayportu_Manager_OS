"use client";

import { useEffect } from "react";

/**
 * Latido de presencia del DJ. Mientras la app está abierta y la pestaña
 * visible, hace POST a /api/dj/heartbeat cada 60s (y al volver a la pestaña).
 * Eso marca al DJ como "● LIVE" para los bookers en Buscar DJs.
 *
 * Se monta en el layout de la app (todos los usuarios de (app) son DJs). No
 * renderiza nada.
 */
export function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/dj/heartbeat", {
        method: "POST",
        keepalive: true,
      }).catch(() => {});
    };
    ping(); // al montar
    const id = setInterval(ping, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
