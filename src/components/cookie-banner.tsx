"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * BL-12 · Aviso informativo de cookies (Ley 21.719, transparencia).
 *
 * DROP solo usa cookies necesarias/funcionales + analítica de 1ª parte SIN IP
 * y sin rastreo de terceros → un aviso informativo (no un muro de
 * consentimiento) es proporcionado. Se descarta con "Entendido" y la elección
 * se recuerda en localStorage. No bloquea nada.
 *
 * Si a futuro se agrega analítica/marketing de terceros que impliquen
 * seguimiento, reemplazar por un banner de consentimiento previo (con rechazo).
 */
const KEY = "drop-cookie-notice-dismissed";

export function CookieBanner() {
  // Arranca oculto para evitar mismatch de hidratación; se decide en el cliente.
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "1") setShow(true);
    } catch {
      /* localStorage no disponible → no mostrar (no bloquea nada) */
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-2xl border-2 border-border bg-bg-panel text-fg shadow-lg px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3"
    >
      <p className="text-[12px] leading-relaxed flex-1">
        Usamos cookies necesarias para iniciar sesión y analítica propia, sin
        rastreo de terceros.{" "}
        <Link href="/cookies" className="underline hover:text-orange">
          Más info
        </Link>
        .
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 border-2 border-border bg-orange text-ink px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-ink hover:text-orange transition-colors"
      >
        Entendido
      </button>
    </div>
  );
}
