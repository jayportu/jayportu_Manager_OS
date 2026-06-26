import Link from "next/link";
import type { Metadata } from "next";
import { getUpcomingPublicEvents } from "@/lib/queries/events";
import { SiteHeader, SiteFooter } from "@/components/public/site-chrome";
import { EventCard } from "@/components/public/event-card";

/**
 * Feed público de eventos para fans (sin cuenta). Muestra todos los shows
 * próximos publicados por DJs activos; cada uno enlaza a /e/[token] donde el fan
 * hace RSVP. Es la cara de DROP. para el público que solo quiere saber qué hay.
 */

export const dynamic = "force-dynamic";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

export const metadata: Metadata = {
  title: "Eventos · DROP.",
  description:
    "Las próximas fiestas y shows de la escena. Confirma tu asistencia sin crear cuenta y entérate cuando tu DJ anuncie el próximo.",
  openGraph: {
    title: "Eventos · DROP.",
    description:
      "Las próximas fiestas y shows de la escena. RSVP sin cuenta.",
    type: "website",
    url: "/eventos",
    siteName: "DROP.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DROP. — Eventos" }],
  },
};

export default async function EventosPage() {
  const eventos = await getUpcomingPublicEvents(60);

  return (
    <main className="bg-bg text-fg min-h-screen flex flex-col">
      <SiteHeader />

      {/* HERO */}
      <section className="border-b-2 border-border relative overflow-hidden">
        <span
          aria-hidden
          className="absolute pointer-events-none select-none"
          style={{ right: -40, bottom: -120, fontFamily: ANTON, fontSize: 320, lineHeight: 0.7, color: "rgba(255,92,0,0.06)" }}
        >
          E.
        </span>
        <div className="max-w-[1140px] mx-auto px-6 py-14 relative z-10">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-orange flex items-center gap-3">
            <span>DROP<span className="text-orange">.</span></span>
            <span className="w-[60px] h-px bg-orange/40" />
            <span>Agenda de la escena</span>
          </div>
          <h1 className="mt-3" style={{ fontFamily: ANTON, fontSize: "clamp(40px,6vw,72px)", lineHeight: 0.95, maxWidth: "16ch" }}>
            Lo que viene<span className="text-orange">.</span>
          </h1>
          <p className="mt-4 text-[17px] text-fg-muted" style={{ maxWidth: "54ch" }}>
            Fiestas y shows de DJs reales. Confirma tu asistencia sin crear cuenta — y pide que te avisen cuando el artista anuncie el próximo.
          </p>
        </div>
      </section>

      {/* FEED */}
      <section className="max-w-[1140px] mx-auto px-6 py-14 w-full flex-1">
        {eventos.length === 0 ? (
          <div className="border-2 border-dashed border-border/40 bg-bg-panel p-12 text-center">
            <div style={{ fontFamily: ANTON, fontSize: 30 }}>
              Aún no hay eventos publicados<span className="text-orange">.</span>
            </div>
            <p className="text-sm text-fg-muted mt-3 max-w-md mx-auto">
              Los DJs están armando sus fechas. Mientras tanto, explora el directorio y guarda a tus favoritos.
            </p>
            <Link
              href="/dj"
              className="inline-block mt-6 px-6 py-3 bg-ink text-white border-2 border-border font-mono text-[12px] font-bold uppercase tracking-[0.12em] hover:bg-orange hover:text-ink transition-colors"
            >
              Buscar DJs →
            </Link>
          </div>
        ) : (
          <>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fg-subtle mb-5">
              {eventos.length} {eventos.length === 1 ? "evento próximo" : "eventos próximos"}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventos.map((ev) => <EventCard key={ev.public_token} ev={ev} />)}
            </div>
          </>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}
