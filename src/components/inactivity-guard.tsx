"use client";

/**
 * Auto-logout por inactividad (defensa en profundidad para equipos compartidos).
 *
 * Tras 30 min sin actividad cierra la sesión. A los 28 min muestra un modal
 * bloqueante "¿Sigues ahí?" con cuenta regresiva → el user confirma "Seguir
 * conectado" o se cierra solo. Se monta en (app)/layout, así que solo corre en
 * las rutas autenticadas.
 *
 * Complementa —NO reemplaza— el TTL de sesión del lado servidor de Supabase
 * (Auth → Sessions). Este timer vive en el navegador y da la UX de aviso; el
 * TTL de Supabase es el respaldo real si el JS no corre.
 *
 * Multi-pestaña: la última actividad se comparte por localStorage, así que
 * moverte en una pestaña mantiene vivas las demás (y confirmar el modal en una
 * lo cierra en todas).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { GlassPanel, MonoLabel } from "@/components/hos";
import { Button } from "@/components/ui/button";

const IDLE_LIMIT_MS = 30 * 60 * 1000; // 30 min hasta el logout
const WARN_BEFORE_MS = 2 * 60 * 1000; // aviso 2 min antes (a los 28 min)
const STORAGE_KEY = "drop:lastActivity";
// mousemove incluido pero throttleado (abajo) para no escribir en cada pixel.
const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
  "click",
  "mousemove",
];

export function InactivityGuard() {
  const lastActivity = useRef<number>(Date.now());
  const warningActive = useRef(false); // gate: con el modal abierto NO auto-reseteamos
  const loggedOut = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const markActivity = useCallback(() => {
    const t = Date.now();
    lastActivity.current = t;
    try {
      localStorage.setItem(STORAGE_KEY, String(t));
    } catch {
      /* storage bloqueado (modo privado, etc.) — seguimos con el ref local */
    }
  }, []);

  const doLogout = useCallback(() => {
    if (loggedOut.current) return;
    loggedOut.current = true;
    // POST (no GET): /logout solo cierra sesión por POST → evita CSRF de logout.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/logout";
    document.body.appendChild(form);
    form.submit();
  }, []);

  const stayConnected = useCallback(() => {
    warningActive.current = false;
    setSecondsLeft(null);
    markActivity();
  }, [markActivity]);

  useEffect(() => {
    markActivity();

    // Actividad del usuario → resetea el contador (throttle a 1 escritura / 2s).
    // Con el modal abierto la ignoramos: el user tiene que confirmar a propósito.
    let lastWrite = 0;
    const onActivity = () => {
      if (warningActive.current) return;
      const t = Date.now();
      if (t - lastWrite < 2000) return;
      lastWrite = t;
      markActivity();
    };
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true })
    );

    // Otra pestaña registró actividad → la respetamos (y cerramos el aviso).
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      const t = Number(e.newValue);
      if (!Number.isNaN(t) && t > lastActivity.current) {
        lastActivity.current = t;
        if (warningActive.current) {
          warningActive.current = false;
          setSecondsLeft(null);
        }
      }
    };
    window.addEventListener("storage", onStorage);

    // Tick de 1s: evalúa el tiempo ocioso y decide aviso / logout.
    const tick = setInterval(() => {
      if (loggedOut.current) return;
      const idle = Date.now() - lastActivity.current;
      if (idle >= IDLE_LIMIT_MS) {
        doLogout();
      } else if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        warningActive.current = true;
        setSecondsLeft(Math.max(0, Math.ceil((IDLE_LIMIT_MS - idle) / 1000)));
      } else if (warningActive.current) {
        // Volvió a estar dentro del límite (p.ej. otra pestaña siguió activa).
        warningActive.current = false;
        setSecondsLeft(null);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener("storage", onStorage);
      clearInterval(tick);
    };
  }, [markActivity, doLogout]);

  if (secondsLeft === null) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdown = `${mins}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-[120] bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
    >
      <div className="w-full max-w-md">
        <GlassPanel padded={false}>
          <div className="p-6 md:p-8">
            <MonoLabel className="tracking-[0.15em]">
              SESIÓN POR INACTIVIDAD
            </MonoLabel>
            <h2
              id="inactivity-title"
              className="font-display text-3xl leading-none mt-2 text-white"
            >
              ¿Sigues ahí?
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/75">
              Por seguridad cerraremos tu sesión por inactividad en{" "}
              <span className="font-mono text-orange">{countdown}</span>. Así
              nadie queda dentro de tu cuenta si dejaste un equipo compartido.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Button
                type="button"
                variant="clayPrimary"
                size="lg"
                className="w-full"
                onClick={stayConnected}
              >
                Seguir conectado
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={doLogout}
              >
                Cerrar sesión ahora
              </Button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
