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
import { GlassPanel, MonoLabel } from "@/components/hos";
import { Button } from "@/components/ui/button";

interface Props {
  /** Por qué se está bloqueando. Controla el copy. */
  reason: "trial_expired" | "subscription_expired" | "past_due";
}

export function SubscriptionRequiredModal({ reason }: Props) {
  function handleLogout() {
    // POST (no GET): /logout solo cierra sesión por POST para evitar CSRF de logout.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/logout";
    document.body.appendChild(form);
    form.submit();
  }

  const copy = COPY[reason];

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-required-title"
    >
      <div className="w-full max-w-lg">
        <GlassPanel padded={false}>
          <div className="p-6 md:p-8">
            <MonoLabel className="tracking-[0.15em]">{copy.kicker}</MonoLabel>
            <h2
              id="subscription-required-title"
              className="font-display text-4xl md:text-5xl leading-[0.95] mt-2 text-white"
            >
              {copy.title}
              <span className="text-orange">.</span>
            </h2>

            <p className="text-sm md:text-base text-white/75 mt-4 leading-relaxed">
              {copy.body}
            </p>

            <div className="mt-6 p-4 rounded-xl border border-white/12 bg-white/[0.04]">
              <MonoLabel className="tracking-[0.12em]">PLAN</MonoLabel>
              <div
                className="text-2xl mt-1 text-white"
                style={{
                  fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                  lineHeight: 0.95,
                }}
              >
                DROP. Pro · $9.990 / mes
              </div>
              <p className="text-xs text-white/50 mt-1">
                Pago con tarjeta · cancela cuando quieras
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <Button asChild variant="clayPrimary" size="lg" className="flex-1">
                <Link href="/suscripcion">Suscribirme →</Link>
              </Button>
              <Button
                type="button"
                variant="clay"
                size="lg"
                onClick={handleLogout}
              >
                Salir
              </Button>
            </div>

            <p className="text-[10px] text-white/40 text-center mt-4 font-mono uppercase tracking-wider">
              Tus datos quedan intactos · vuelves cuando quieras
            </p>
          </div>
        </GlassPanel>
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
    body: "Tus 15 días gratis llegaron al final. Para seguir usando DROP, suscríbete por $9.990 al mes. Sin contratos, cancelas cuando quieras.",
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
