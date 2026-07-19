"use client";

/**
 * Sprint 23.5 — Modal full-screen que bloquea la app cuando beta_status='expired'.
 *
 * No tiene botón "X" para cerrar. Solo permite:
 *   - "Salir" → logout
 *   - "Quiero suscribirme" → mailto a hola@dropgigs.com (Sprint 24 traerá el flow real)
 *
 * Se muestra DEBAJO de cualquier otra cosa de la UI, no permite que el user
 * interactúe con la app. Es read-only para todo propósito práctico, aunque
 * técnicamente puedan ver sus datos detrás del overlay.
 */

import { GlassPanel, MonoLabel } from "@/components/hos";
import { Button } from "@/components/ui/button";

export function BetaExpiredModal() {
  function handleLogout() {
    // POST (no GET): /logout solo cierra sesión por POST para evitar CSRF de logout.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/logout";
    document.body.appendChild(form);
    form.submit();
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-expired-title"
    >
      <div className="w-full max-w-lg">
        <GlassPanel padded={false}>
          <div className="p-6 md:p-8">
            <MonoLabel className="tracking-[0.15em]">BETA EXPIRÓ</MonoLabel>
            <h2
              id="beta-expired-title"
              className="font-display text-4xl md:text-5xl leading-[0.95] mt-2 text-white"
            >
              GRACIAS<span className="text-orange">.</span>
            </h2>

            <div className="mt-5 space-y-4 text-sm md:text-base leading-relaxed text-white/75">
              <p>
                Tus <strong className="text-white">15 días de beta</strong> en DROP terminaron. Gracias
                por probar la app y por el feedback que dejaste — fue clave para
                mejorarla.
              </p>
              <p>
                Tu cuenta sigue ahí con todos tus datos. Te contactaré directamente
                cuando abramos la siguiente etapa.
              </p>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="clayPrimary"
                size="lg"
                onClick={handleLogout}
              >
                Cerrar sesión
              </Button>
            </div>

            <div className="border-t border-white/10 mt-6 pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-white/40 text-center">
              DROP. · THE DJ OS · MADE IN SANTIAGO
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
