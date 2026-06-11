"use client";

/**
 * Beacon de tráfico del sitio. En cada navegación manda un pageview a
 * /api/site-track (el server decide anónimo/registrado por la sesión).
 * sesión = mismo session_id mientras no pasen 30 min de inactividad → permite
 * estimar visitas únicas y estadía. Fire-and-forget (sendBeacon), no bloquea.
 */
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const SID_KEY = "drop_sid";
const SID_TS = "drop_sid_t";
const SESSION_GAP = 30 * 60 * 1000;

function getSessionId(): string {
  try {
    const now = Date.now();
    let sid = localStorage.getItem(SID_KEY);
    const last = Number(localStorage.getItem(SID_TS) || 0);
    if (!sid || now - last > SESSION_GAP) {
      sid = `${now.toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SID_KEY, sid);
    }
    localStorage.setItem(SID_TS, String(now));
    return sid;
  } catch {
    return "nostorage";
  }
}

export function SiteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const payload = JSON.stringify({
        path: pathname,
        session_id: getSessionId(),
        referrer: document.referrer || null,
        utm_source: new URLSearchParams(window.location.search).get("utm_source"),
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/site-track",
          new Blob([payload], { type: "application/json" })
        );
      } else {
        fetch("/api/site-track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    } catch {
      /* tracking nunca rompe la página */
    }
  }, [pathname]);

  return null;
}
