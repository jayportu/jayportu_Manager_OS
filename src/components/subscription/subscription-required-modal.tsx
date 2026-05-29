"use client";

/**
 * Sprint S19 — Modal bloqueante cuando el trial venció o la suscripción
 * expiró. Equivalente al BetaExpiredModal pero apunta a /suscripcion.
 *
 * No tiene botón X. Solo permite:
 *   - "Suscribirme" → /suscripcion (página de checkout)
 *   - "Salir" → logout
 *
 * Se renderiza sobre el resto de la UI; aunque técnicamente el user
 * puede ver sus datos detrás, no puede interactuar.
 */

import Link from "next/link";

interface Props {
  /** Por qué se está bloqueando. Controla el copy. */
  reason: "trial_expired" | "subscription_expired" | "past_due";
}

export function SubscriptionRequiredModal({ reason }: Props) {
  function handleLogout() {
    window.location.href = "/logout";
  }

  const copy = COPY[reason];

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-required-title"
    >
      <div
        className="w-full max-w-lg bg-cream border-[3px] border-ink p-6 md:p-8"
        style={{ boxShadow: "12px 12px 0 0 #FF5C00" }}
      >
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-orange">
          — {copy.kicker}
        </div>
        <h2
          id="subscription-required-title"
          className="font-display text-4xl md:text-5xl leading-[0.95] mt-2"
        >
          {copy.title}
          <span className="text-orange">.</span>
        </h2>

        <p className="text-sm md:text-base text-fg mt-4 leading-relaxed">
          {copy.body}
        </p>

        <div className="mt-6 p-4 border-2 border-ink bg-white">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-1">
            — PLAN
          </div>
          <div
            className="text-2xl"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              lineHeight: 0.95,
            }}
          >
            DROP. Pro · $10.000 / mes
          </div>
          <p className="text-xs text-fg-muted mt-1">
            Pago con tarjeta · cancela cuando quieras
          </p>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Link
            href="/suscripcion"
            className="flex-1 inline-flex items-center justify-center h-11 px-4 bg-ink text-orange border-2 border-ink hover:bg-orange hover:text-ink font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
          >
            Suscribirme →
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center h-11 px-4 bg-cream text-ink border-2 border-ink hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
          >
            Salir
          </button>
        </div>

        <p className="text-[10px] text-fg-subtle text-center mt-4 font-mono uppercase tracking-wider">
          Tus datos quedan intactos · vuelves cuando quieras
        </p>
      </div>
    </div>
  );
}

const COPY: Record<
  "trial_expired" | "subscription_expired" | "past_due",
  { kicker: string; title: string; body: string }
> = {
  trial_expired: {
    kicker: "TU TRIAL TERMINÓ",
    title: "Gracias por probar",
    body: "Tus 7 días gratis llegaron al final. Para seguir usando DROP, suscríbete por $10.000 al mes. Sin contratos, cancelas cuando quieras.",
  },
  subscription_expired: {
    kicker: "SUSCRIPCIÓN VENCIDA",
    title: "Reactiva tu cuenta",
    body: "Tu suscripción terminó. Reactívala con un click y sigue desde donde estabas. Todos tus datos quedan intactos.",
  },
  past_due: {
    kicker: "PAGO PENDIENTE",
    title: "Tu último pago falló",
    body: "No pudimos cobrar tu última mensualidad. Actualiza tu tarjeta o paga manualmente para mantener el acceso a DROP.",
  },
};
