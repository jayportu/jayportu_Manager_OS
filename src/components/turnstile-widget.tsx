"use client";

/**
 * Widget de Cloudflare Turnstile (CAPTCHA). Se renderiza SOLO si está
 * configurado `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — si no, no pinta nada y los
 * forms siguen funcionando igual (dormido hasta poner las llaves).
 *
 * Uso: <TurnstileWidget onVerify={setToken} onExpire={() => setToken(null)} />
 * Para forzar un token nuevo tras un submit fallido, dale una `key` distinta
 * desde el padre (el token de Turnstile es de un solo uso).
 */

import { useEffect, useRef } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
/** True si el CAPTCHA está activo (hay site key). Los forms lo usan para exigir token. */
export const TURNSTILE_ENABLED = !!SITE_KEY;

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: string;
        }
      ) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onVerify, onExpire }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  // Refs para los callbacks → el efecto corre una sola vez sin re-render del widget.
  const verifyRef = useRef(onVerify);
  verifyRef.current = onVerify;
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    function doRender() {
      const w = window.turnstile;
      if (cancelled || !w || !ref.current || idRef.current !== null) return;
      idRef.current = w.render(ref.current, {
        sitekey: SITE_KEY,
        callback: (t: string) => verifyRef.current(t),
        "expired-callback": () => expireRef.current?.(),
        "error-callback": () => expireRef.current?.(),
      });
    }

    if (window.turnstile) {
      doRender();
    } else {
      let s = document.querySelector<HTMLScriptElement>(
        `script[src="${SCRIPT_SRC}"]`
      );
      if (!s) {
        s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        document.head.appendChild(s);
      }
      s.addEventListener("load", doRender);
    }

    return () => {
      cancelled = true;
      const w = window.turnstile;
      if (idRef.current && w) {
        try {
          w.remove(idRef.current);
        } catch {
          /* widget ya removido */
        }
      }
      idRef.current = null;
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="my-1" />;
}
