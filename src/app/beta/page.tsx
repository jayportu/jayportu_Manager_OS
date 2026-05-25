/**
 * Sprint 23.5 — Landing público /beta con form de solicitud.
 *
 * SEO: indexable. Server component que renderiza el pitch + monta el
 * client form.
 */

import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { BetaForm } from "./beta-form";

export const metadata: Metadata = {
  title: "Beta — DROP.",
  description:
    "DROP es el sistema operativo para DJs independientes. CRM, calendario con $, growth, tracklists, press kit. Solicita acceso a la beta cerrada de 15 días.",
};

export default function BetaPage() {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="border-b-2 border-ink px-6 md:px-10 py-5 flex items-center gap-4">
        <Logo variant="horizontal" tone="light" size={120} />
        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.15em] text-fg-muted">
          Beta cerrada · acceso anticipado
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16">
          {/* Pitch */}
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-orange mb-3">
              — ACCESO ANTICIPADO
            </div>
            <h1 className="font-display text-5xl md:text-6xl leading-[0.95] mb-5">
              SOY DJ.<br />
              QUIERO ENTRAR<span className="text-orange">.</span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed max-w-md">
              DROP es el sistema operativo para DJs independientes.
              CRM, calendario con $, growth, tracklists, press kit.
              Todo en uno. Hoy en beta cerrada con 15 días gratis.
            </p>
            <ul className="mt-7 space-y-2 text-sm">
              {[
                "15 días sin restricciones",
                "Soporte directo conmigo (Jay Portu)",
                "Tu feedback decide el roadmap",
                "Si te queda, prioridad en el lanzamiento abierto",
              ].map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 border-t border-ink/15 pt-2"
                >
                  <span className="text-orange font-bold">→</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 text-xs text-fg-muted font-mono uppercase tracking-wider">
              drop.dj · Santiago, Chile
            </div>
          </div>

          {/* Form */}
          <div>
            <BetaForm />
          </div>
        </div>
      </main>

      <footer className="border-t-2 border-ink px-6 md:px-10 py-6 mt-20 text-[10px] font-mono uppercase tracking-[0.2em] text-fg-muted text-center">
        DROP. v0.13 · The DJ OS · Made in Santiago
      </footer>
    </div>
  );
}
