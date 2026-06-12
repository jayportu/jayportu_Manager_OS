"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca los datos del server component cada `seconds` (sin recargar la
 *  página). Da el efecto "en vivo" del dashboard sin WebSockets. Solo refresca
 *  con la pestaña visible: una pestaña en segundo plano no debe seguir gastando
 *  invocaciones de función (cada refresh re-ejecuta el server component). */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
