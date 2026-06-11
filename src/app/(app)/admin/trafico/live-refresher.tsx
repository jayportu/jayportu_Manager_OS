"use client";

/**
 * Mantiene /admin/trafico "vivo": cada `intervalSec` hace un refresco suave
 * (router.refresh re-ejecuta el server component y reemplaza los números en su
 * lugar, sin recargar la página ni perder scroll). Solo refresca con la pestaña
 * visible (no malgasta queries en segundo plano) y refresca al volver a ella.
 * No renderiza nada — es una isla de comportamiento.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresher({ intervalSec = 15 }: { intervalSec?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalSec * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalSec, router]);

  return null;
}
