"use client";

/**
 * Sección "Funcionalidades" del home — muestra el producto, no lo describe.
 * Dividida en VITRINA (lo que ve el booker) y BACK-OFFICE (lo que solo ve el
 * DJ; el diferenciador vs la competencia). Reusa los componentes reales
 * StagePlot + GearCards (alimentados por el parser del rider). Animaciones
 * (reveal en scroll, barras que se llenan, contadores) respetando
 * prefers-reduced-motion.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { StagePlot } from "@/components/tech-rider/stage-plot";
import { GearCards } from "@/components/tech-rider/gear-cards";
import { parseRiderText } from "@/lib/tech-rider/parse";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

// Rider de ejemplo (ficticio) → alimenta StagePlot + GearCards reales.
const SAMPLE_RIDER = parseRiderText(
  "3x Pioneer CDJ-3000 (linked)\n1x Pioneer DJM-A9\n2x Booth monitor"
);

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }),
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return { ref, inView };
}

function CountUp({ to, run, fmt }: { to: number; run: boolean; fmt?: (n: number) => string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(to); return; }
    let raf = 0;
    let t0: number | null = null;
    const dur = 1200;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      setN(Math.round(to * (0.1 + 0.9 * p * (2 - p))));
      if (p < 1) raf = requestAnimationFrame(step);
      else setN(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{fmt ? fmt(n) : n}</>;
}

const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1).replace(/\.0$/, "")}k` : String(n));

/** Wrapper de reveal: aparece con leve subida + stagger cuando la sección entra. */
function Reveal({ show, delay = 0, className = "", children }: { show: boolean; delay?: number; className?: string; children: React.ReactNode }) {
  return (
    <div
      className={`transition-all duration-500 ease-out ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const KICK = "font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange";
const CARD = "border-2 border-border bg-bg-panel p-6 flex flex-col h-full transition-shadow hover:shadow-[8px_8px_0_#E85A0C]";
const H3 = { fontFamily: ANTON, fontSize: "clamp(24px,2.4vw,30px)", lineHeight: 0.95 } as const;

function GroupDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-block bg-ink text-white font-mono text-[11px] font-bold uppercase tracking-[0.1em] px-3 py-1.5 mt-10 mb-4">
      {children}
    </div>
  );
}

const MATCH = [
  { name: "NOX", w: 94 },
  { name: "KORU", w: 81 },
  { name: "VELA", w: 67 },
];

const COVERS: { t: string; svg: React.ReactNode }[] = [
  { t: "Subsuelo", svg: (<><rect width="100" height="100" fill="#0A0A0A" /><circle cx="50" cy="40" r="27" fill="#E85A0C" /><rect y="63" width="100" height="3" fill="#F4EFE7" /><rect y="71" width="100" height="1.5" fill="#F4EFE7" opacity=".5" /><rect y="77" width="100" height="1" fill="#F4EFE7" opacity=".3" /></>) },
  { t: "Cobre", svg: (<><rect width="100" height="100" fill="#E85A0C" /><polygon points="0,100 100,0 100,100" fill="#0A0A0A" /><line x1="0" y1="100" x2="100" y2="0" stroke="#F4EFE7" strokeWidth="2" /></>) },
  { t: "Madrugada", svg: (<><rect width="100" height="100" fill="#F4EFE7" /><circle cx="50" cy="50" r="34" fill="none" stroke="#0A0A0A" strokeWidth="2" /><circle cx="50" cy="50" r="22" fill="none" stroke="#0A0A0A" strokeWidth="1" /><circle cx="50" cy="50" r="6" fill="#E85A0C" /></>) },
  { t: "Ritual", svg: (<><rect width="100" height="100" fill="#F4EFE7" /><polygon points="50,16 84,84 16,84" fill="#0A0A0A" /><polygon points="50,44 67,84 33,84" fill="#E85A0C" /></>) },
  { t: "Niebla", svg: (<><rect width="100" height="100" fill="#2b2f36" /><rect y="30" width="100" height="2" fill="#F4EFE7" opacity=".85" /><rect y="40" width="100" height="2" fill="#F4EFE7" opacity=".6" /><rect y="50" width="100" height="3" fill="#E85A0C" /><rect y="61" width="100" height="2" fill="#F4EFE7" opacity=".4" /><rect y="70" width="100" height="2" fill="#F4EFE7" opacity=".25" /></>) },
  { t: "Tránsito", svg: (<><rect width="100" height="100" fill="#0A0A0A" /><rect x="20" y="20" width="60" height="60" fill="none" stroke="#E85A0C" strokeWidth="3" /><rect x="34" y="34" width="32" height="32" fill="none" stroke="#F4EFE7" strokeWidth="2" /><rect x="46" y="46" width="8" height="8" fill="#E85A0C" /></>) },
];

const CRM = [
  { tag: "Club", name: "Club La Feria", meta: "últ. 15 mar · $600k", rem: "⏰ Escribir jun" },
  { tag: "Promotor", name: "Tomás · Subterráneo", meta: "últ. 2 feb · $450k" },
  { tag: "Booker", name: "María González", meta: "3 eventos · ★ favorito" },
];

export function FuncionalidadesSection() {
  const vitrina = useInView<HTMLDivElement>();
  const back = useInView<HTMLDivElement>();

  // Mini-calendario ilustrativo: 1=disponible(naranjo), 2=ocupado(ink), 0=vacío.
  const calDays = [0, 0, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1];

  return (
    <section className="border-y-2 border-border bg-cream">
      <div className="max-w-[1140px] mx-auto px-6 py-16">
        <div className={KICK}>— Funcionalidades</div>
        <h2 className="mt-2.5 mb-3" style={{ fontFamily: ANTON, fontSize: "clamp(32px,5vw,56px)", lineHeight: 0.95 }}>
          No es un PDF. Es tu carrera entera<span className="text-orange">.</span>
        </h2>
        <p className="text-[16px] text-fg-muted" style={{ maxWidth: "60ch" }}>
          Un link vivo que te consigue bookings <strong className="text-fg">y</strong> te ayuda a gestionarlos —
          dividido en lo que ve el booker y lo que solo ves tú.
        </p>

        {/* ───────── VITRINA ───────── */}
        <GroupDivider>① Tu vitrina — lo que ve el booker</GroupDivider>
        <div ref={vitrina.ref} className="grid md:grid-cols-2 gap-4">
          {/* Tech rider */}
          <Reveal show={vitrina.inView} delay={0} className="h-full">
            <div className={CARD}>
              <div className={KICK}>Tech rider</div>
              <h3 className="mt-2 mb-1.5" style={H3}>El técnico sabe qué armar antes de que llegues.</h3>
              <p className="text-sm text-fg-muted mb-4">Escribes tu equipo en texto y DROP dibuja tu cabina + tus equipos. Cero malentendidos en el venue.</p>
              <div className="mt-auto border border-border overflow-hidden">
                <StagePlot items={SAMPLE_RIDER} artistName="NOX" />
                <GearCards items={SAMPLE_RIDER} />
              </div>
            </div>
          </Reveal>

          {/* Disponibilidad */}
          <Reveal show={vitrina.inView} delay={90} className="h-full">
            <div className={CARD}>
              <div className={KICK}>Disponibilidad</div>
              <h3 className="mt-2 mb-1.5" style={H3}>Tu agenda, clara de un vistazo.</h3>
              <p className="text-sm text-fg-muted mb-4">Tus fechas libres y ocupadas se arman solas desde tu calendario. El booker filtra “¿quién está libre el 25?” y apareces tú.</p>
              <div className="mt-auto border border-border bg-cream p-3">
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                    <div key={i} className="text-center font-mono text-[9px] font-bold text-fg-subtle">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calDays.map((s, i) => (
                    <div
                      key={i}
                      className={`aspect-square flex items-center justify-center font-mono text-[11px] tabular-nums transition-transform duration-300 ${s === 1 ? "bg-orange text-ink font-bold" : s === 2 ? "bg-ink text-white/70 line-through" : "text-fg-subtle"} ${vitrina.inView ? "scale-100" : "scale-0"}`}
                      style={{ transitionDelay: `${i * 22}ms` }}
                    >
                      {s === 0 ? "" : i - 1}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2.5 font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange border border-border" />Disponible</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-ink" />Ocupado</span>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Música / discografía */}
          <Reveal show={vitrina.inView} delay={180} className="h-full">
            <div className={CARD}>
              <div className={KICK}>Música · discografía</div>
              <h3 className="mt-2 mb-1.5" style={H3}>Tu música suena, no se describe.</h3>
              <p className="text-sm text-fg-muted mb-4">Tu SoundCloud, YouTube y Spotify se reproducen <strong className="text-fg">dentro de tu perfil</strong>. Y tu discografía de Bandcamp se carga sola, con carátula.</p>
              <div className="mt-auto grid grid-cols-3 gap-2">
                {COVERS.map((c) => (
                  <div key={c.t} className="border border-border bg-bg-panel">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" className="block w-full aspect-square">{c.svg}</svg>
                    <div className="px-1.5 py-1 text-[10px] font-semibold leading-tight">{c.t}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Smart Match */}
          <Reveal show={vitrina.inView} delay={270} className="h-full">
            <div className={CARD}>
              <div className={KICK}>Búsqueda · Smart Match</div>
              <h3 className="mt-2 mb-1.5" style={H3}>Te encuentran por lo que tocas.</h3>
              <p className="text-sm text-fg-muted mb-4">El booker filtra por género, ciudad, fecha y presupuesto — y DROP le dice a quién llamar. Mientras más completo tu perfil, más arriba sales.</p>
              <div className="mt-auto border border-border bg-cream p-4 flex flex-col gap-3">
                {MATCH.map((m) => (
                  <div key={m.name} className="grid grid-cols-[70px_1fr_40px] gap-3 items-center">
                    <span style={{ fontFamily: ANTON, fontSize: 16 }}>{m.name}</span>
                    <span className="h-3 border-2 border-border bg-bg-panel overflow-hidden">
                      <span className="block h-full bg-orange" style={{ width: vitrina.inView ? `${m.w}%` : "0%", transition: "width 1.1s cubic-bezier(.2,.8,.2,1)" }} />
                    </span>
                    <span className="font-mono text-[11px] font-bold text-right">{m.w}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* ───────── BACK-OFFICE ───────── */}
        <GroupDivider>② Tu back-office — lo que solo ves tú <span className="text-orange">· acá está la diferencia</span></GroupDivider>
        <p className="text-[15px] text-fg-muted mb-4" style={{ maxWidth: "64ch" }}>
          Una vitrina te consigue <strong className="text-fg">un</strong> gig. DROP te ayuda a construir una{" "}
          <strong className="text-fg">carrera</strong>: ordena a tus contactos, tus fechas y tu plata — lo que haría un manager, pero es tuyo.
        </p>
        <div ref={back.ref} className="grid md:grid-cols-2 gap-4">
          {/* CRM */}
          <Reveal show={back.inView} delay={0} className="h-full">
            <div className={CARD}>
              <div className={KICK}>Tu libreta de contactos (un “CRM”)</div>
              <h3 className="mt-2 mb-1.5" style={H3}>Acuérdate de cada booker, cobro y fecha.</h3>
              <p className="text-sm text-fg-muted mb-4">Una agenda de contactos con memoria: quién te contrató, cuánto cobraste y cuándo conviene volver a escribirle. Es lo que un manager anota en una planilla — acá pasa solo.</p>
              <div className="mt-auto flex flex-col gap-2">
                {CRM.map((r) => (
                  <div key={r.name} className="flex items-center gap-2 flex-wrap border border-border bg-cream px-2.5 py-2">
                    <span className="font-mono text-[8px] font-bold uppercase tracking-wider border border-border px-1.5 py-0.5">{r.tag}</span>
                    <span className="text-[13px] font-semibold">{r.name}</span>
                    <span className="font-mono text-[10px] text-fg-muted ml-auto">{r.meta}</span>
                    {r.rem && <span className="font-mono text-[9px] font-bold uppercase bg-orange text-ink px-1.5 py-0.5 animate-pulse">{r.rem}</span>}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* Métricas */}
          <Reveal show={back.inView} delay={90} className="h-full">
            <div className={CARD}>
              <div className={KICK}>Métricas de crecimiento</div>
              <h3 className="mt-2 mb-1.5" style={H3}>Mira si tu carrera está creciendo.</h3>
              <p className="text-sm text-fg-muted mb-4">Tus seguidores, escuchas y solicitudes en un solo lugar — para saber qué funciona y mostrar números reales a quien te contrata.</p>
              <div className="mt-auto border border-border bg-cream p-4 flex items-end gap-6 flex-wrap">
                <div>
                  <div style={{ fontFamily: ANTON, fontSize: 28 }}><CountUp to={2400} run={back.inView} fmt={fmtK} /> <span className="text-orange text-[14px]">↑</span></div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted mt-1">Seguidores</div>
                </div>
                <div>
                  <div style={{ fontFamily: ANTON, fontSize: 28 }}><CountUp to={18000} run={back.inView} fmt={fmtK} /> <span className="text-orange text-[14px]">↑</span></div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted mt-1">Escuchas/mes</div>
                </div>
                <div>
                  <div style={{ fontFamily: ANTON, fontSize: 28 }}><CountUp to={12} run={back.inView} /></div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted mt-1">Solicitudes</div>
                </div>
                <div className="flex items-end gap-1 h-9 ml-auto">
                  {[40, 52, 48, 66, 72, 64, 88, 100].map((h, i) => (
                    <span key={i} className="w-1.5 bg-ink origin-bottom transition-transform duration-500" style={{ height: `${h}%`, transform: back.inView ? "scaleY(1)" : "scaleY(0)", transitionDelay: `${i * 55}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Bandeja de bookings (full width) */}
          <Reveal show={back.inView} delay={180} className="md:col-span-2 h-full">
            <div className={CARD}>
              <div className={KICK}>Bandeja de bookings</div>
              <h3 className="mt-2 mb-1.5" style={H3}>Recibe solicitudes, no spam de DMs<span className="text-orange">.</span></h3>
              <p className="text-sm text-fg-muted mb-4" style={{ maxWidth: "60ch" }}>Los bookers te escriben desde tu press kit con los datos del evento listos: fecha, lugar, fee propuesto. Aceptas, contraofertas o rechazas con un clic. El trato lo cierran ustedes, directo y sin comisión.</p>
              <div className="mt-auto border border-border bg-cream flex flex-wrap">
                <div className="flex-1 min-w-[170px] border-r border-border p-3.5">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">Nueva solicitud</div>
                  <div style={{ fontFamily: ANTON, fontSize: 18 }} className="mt-1">Club La Feria</div>
                  <div className="font-mono text-[11px] text-fg-muted mt-0.5">15 mar · 22:00 · $600.000</div>
                  <span className="inline-block mt-2 font-mono text-[9px] font-bold uppercase border border-border bg-orange text-ink px-1.5 py-0.5 animate-pulse">● Pendiente</span>
                </div>
                <div className="flex-1 min-w-[170px] border-r border-border p-3.5">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">Confirmado</div>
                  <div style={{ fontFamily: ANTON, fontSize: 18 }} className="mt-1">Terraza Bellas Artes</div>
                  <div className="font-mono text-[11px] text-fg-muted mt-0.5">22 mar · Contrato firmado</div>
                  <span className="inline-block mt-2 font-mono text-[9px] font-bold uppercase border border-border bg-cream text-fg px-1.5 py-0.5">✓ Cerrado</span>
                </div>
                <div className="flex-1 min-w-[150px] p-3.5">
                  <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">Este mes</div>
                  <div style={{ fontFamily: ANTON, fontSize: 30 }} className="mt-1"><CountUp to={3} run={back.inView} /> <span className="text-[14px] text-fg-muted">gigs</span></div>
                  <div className="font-mono text-[11px] text-fg-muted mt-0.5">$1.8M en agenda</div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link href="/beta" className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-orange text-ink border-2 border-border font-mono text-[12px] font-bold uppercase tracking-[0.14em] hover:bg-ink hover:text-orange transition-colors">
            Crea tu press kit gratis →
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-fg-muted">Beta · gratis 15 días, sin tarjeta</span>
        </div>
      </div>
    </section>
  );
}
