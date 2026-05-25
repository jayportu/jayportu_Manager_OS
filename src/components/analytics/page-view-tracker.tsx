"use client";

/**
 * Sprint 23.5 — Tracker automático de page_view.
 *
 * Se monta una vez en el layout (app). Cada cambio de pathname dispara
 * un evento page_view. Cero impacto en LCP (no bloquea render).
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics/track";

export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    trackEvent("page_view", { path: pathname });
  }, [pathname]);
  return null;
}
