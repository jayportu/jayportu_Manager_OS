"use client";

/**
 * Sprint 23.5 — Modal full-screen que bloquea la app cuando beta_status='expired'.
 *
 * No tiene botón "X" para cerrar. Solo permite:
 *   - "Salir" → logout
 *   - "Quiero suscribirme" → mailto a hola@jayportu.com (Sprint 24 traerá el flow real)
 *
 * Se muestra DEBAJO de cualquier otra cosa de la UI, no permite que el user
 * interactúe con la app. Es read-only para todo propósito práctico, aunque
 * técnicamente puedan ver sus datos detrás del overlay.
 */

export function BetaExpiredModal() {
  function handleLogout() {
    // Simple navigation: server route /logout maneja el sign out
    window.location.href = "/logout";
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="beta-expired-title"
    >
      <div
        className="w-full max-w-lg bg-cream border-[3px] border-ink p-6 md:p-8"
        style={{ boxShadow: "12px 12px 0 0 #FF5C00" }}
      >
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-orange">
          — BETA EXPIRÓ
        </div>
        <h2
          id="beta-expired-title"
          className="font-display text-4xl md:text-5xl leading-[0.95] mt-2"
        >
          GRACIAS<span className="text-orange">.</span>
        </h2>

        <div className="mt-5 space-y-4 text-sm md:text-base leading-relaxed">
          <p>
            Tus <strong>15 días de beta</strong> en DROP terminaron. Gracias
            por probar la app y por el feedback que dejaste — fue clave para
            mejorarla.
          </p>
          <p>
            Tu cuenta sigue ahí con todos tus datos. Te contactaré directamente
            cuando abramos la siguiente etapa.
          </p>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center h-11 px-6 bg-ink text-orange border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-[0.1em] hover:bg-orange hover:text-ink transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="border-t-2 border-ink/15 mt-6 pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-fg-subtle text-center">
          DROP. · THE DJ OS · MADE IN SANTIAGO
        </div>
      </div>
    </div>
  );
}
