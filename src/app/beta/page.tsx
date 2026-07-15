/**
 * Sprint 23.5 — Landing público /beta con form de solicitud.
 *
 * SEO: indexable. Server component que renderiza el pitch + monta el
 * client form.
 */

import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { GlassPanel, MonoLabel } from "@/components/hos";
import { BetaForm } from "./beta-form";

export const metadata: Metadata = {
  title: "Beta — DROP.",
  description:
    "DROP es el sistema operativo para DJs independientes. CRM, calendario con $, growth, tracklists, press kit. Solicita acceso a la beta de 15 días.",
};

export default function BetaPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg">
      {/* Ambiente radial (firma Hybrid OS, como el resto de Público) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 60% at 50% -10%, rgb(var(--drop-orange) / 0.12), transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center gap-4 border-b border-white/10 px-6 md:px-10 py-5">
        <Logo variant="horizontal" tone="ink" size={120} />
        <div className="ml-auto flex items-center gap-4">
          <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
            Beta · acceso anticipado
          </span>
          <a
            href="/login"
            className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg hover:text-orange transition-colors border-b border-transparent hover:border-orange"
          >
            ¿Ya tienes cuenta? Iniciar sesión →
          </a>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          {/* Pitch */}
          <div>
            <div className="mb-3">
              <MonoLabel className="text-[11px] tracking-[0.15em]">
                ACCESO ANTICIPADO
              </MonoLabel>
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[0.95] mb-5">
              SOY DJ.<br />
              QUIERO ENTRAR<span className="text-orange">.</span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed max-w-md text-fg-muted">
              DROP es el sistema operativo para DJs independientes.
              CRM, calendario con $, growth, tracklists, press kit.
              Todo en uno. Hoy en beta con 15 días gratis.
            </p>
            <GlassPanel className="mt-7">
              <ul className="space-y-2 text-sm">
                {[
                  "15 días sin restricciones",
                  "Soporte directo con el equipo DROP.",
                  "Tu feedback nos ayuda a mejorar la plataforma",
                  "Si quieres seguir, tendrás prioridad y un descuento inicial en el lanzamiento",
                ].map((bullet, i) => (
                  <li
                    key={bullet}
                    className={`flex items-start gap-3 ${
                      i === 0 ? "" : "border-t border-white/10 pt-2"
                    }`}
                  >
                    <span className="text-orange font-bold">→</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
            <div className="mt-10 text-xs text-fg-muted font-mono uppercase tracking-wider">
              dropgigs.com · Santiago, Chile
            </div>
          </div>

          {/* Form */}
          <div>
            <BetaForm />
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 px-6 md:px-10 py-6 mt-20 text-[10px] font-mono uppercase tracking-[0.2em] text-fg-muted text-center">
        DROP. v0.13 · The DJ OS · Made in Santiago
      </footer>
    </div>
  );
}
