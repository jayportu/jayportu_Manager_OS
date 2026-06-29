"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/** Palabras que rotan en el titular (cross-dissolve). */
const WORDS = ["CARRERA", "BOOKING", "PRESS KIT", "AGENDA", "SONIDO"];

/**
 * Luces de escenario dibujadas en canvas a baja-res (ver draw()). Reproducen el
 * "bokeh" cálido del mockup (naranjo arriba-derecha + naranjo abajo-izquierda +
 * blanco al centro) pero animadas vía rAF — sin filter:blur (lección Retina).
 */
const LIGHTS = [
  { col: "232,90,12", a: 0.62, r: 0.64, x0: 0.82, amp: 0.1, spd: 0.00024, ph: 0.0, y: 0.12 },
  { col: "232,90,12", a: 0.46, r: 0.54, x0: 0.18, amp: 0.16, spd: 0.00033, ph: 2.1, y: 0.92 },
  { col: "247,247,247", a: 0.12, r: 0.44, x0: 0.5, amp: 0.2, spd: 0.00018, ph: 4.2, y: 0.42 },
];

export type HeroStat = { n: string; suf?: string; l: string };

/**
 * Hero del landing (spec: MOCKUP_landing_v2.html).
 *  - Titular con cross-dissolve: "TU [CARRERA→BOOKING→…] VIVE EN DROP."
 *  - Escena de evento (público en silueta + luz cálida) en <canvas> a baja
 *    resolución con requestAnimationFrame — NO filter:blur/mix-blend animados
 *    (causan tirones en Retina; lección del rebrand).
 *  - La escena de fondo es PLACEHOLDER. Para usar una foto real, pásala como
 *    `sceneImageUrl` y reemplaza el canvas (mismo contenedor `.scene`).
 *  - Respeta prefers-reduced-motion (titular estático + canvas dibuja 1 frame).
 */
export function LandingHero({
  stats,
  sceneImageUrl,
}: {
  stats: HeroStat[];
  sceneImageUrl?: string;
}) {
  // ── Cross-dissolve del titular (dos capas apiladas que se funden) ──
  const [layers, setLayers] = useState<[string, string]>([WORDS[0], ""]);
  const [cur, setCur] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // titular estático
    let wi = 0;
    let c = 0;
    const id = window.setInterval(() => {
      wi = (wi + 1) % WORDS.length;
      const n = 1 - c;
      const nextWord = WORDS[wi];
      setLayers((prev) => {
        const x: [string, string] = [prev[0], prev[1]];
        x[n] = nextWord;
        return x;
      });
      c = n;
      setCur(n);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // ── Luces en canvas (baja-res + rAF + mezcla aditiva = fluido en Retina) ──
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let W = 1;
    let H = 1;
    let raf = 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const resize = () => {
      const r = c.getBoundingClientRect();
      W = c.width = Math.max(1, Math.round(r.width * 0.6));
      H = c.height = Math.max(1, Math.round(r.height * 0.6));
    };
    resize();
    window.addEventListener("resize", resize);
    // ResizeObserver: re-mide cuando el canvas obtiene su caja real (cubre el
    // caso de montar antes del layout → ancho 0 → glow invisible).
    const ro =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(c);
    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const L of LIGHTS) {
        const cx = (L.x0 + Math.sin(t * L.spd + L.ph) * L.amp) * W;
        const cy = L.y * H;
        const rad = L.r * Math.max(W, H);
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g.addColorStop(0, `rgba(${L.col},${L.a})`);
        g.addColorStop(0.45, `rgba(${L.col},${L.a * 0.28})`);
        g.addColorStop(1, `rgba(${L.col},0)`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
    };
    if (reduce) {
      draw(0);
    } else {
      const loop = (t: number) => {
        draw(t || 0);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      window.removeEventListener("resize", resize);
      ro?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <header className="relative flex items-center overflow-hidden bg-bg min-h-[88vh]">
      {/* ── ESCENA DE EVENTO (placeholder → reemplazar por foto real) ── */}
      <div aria-hidden className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {sceneImageUrl ? (
          <div
            className="absolute inset-0"
            style={{ backgroundImage: `url(${sceneImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
        ) : (
          <>
            {/* glow cálido ESTÁTICO: un radial-gradient ya es suave, así que no
                necesita filter:blur (que sí causa jank al animarse en Retina).
                Da el brillo de esquina del mockup; el canvas le suma movimiento. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 50% at 82% 4%, rgba(232,90,12,.36), transparent 68%)," +
                  "radial-gradient(52% 44% at 12% 98%, rgba(232,90,12,.22), transparent 70%)",
              }}
            />
            <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
          </>
        )}
        {/* viñeta izquierda → el texto del hero queda legible */}
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background:
              "linear-gradient(90deg,#0B0B0B 22%,rgba(11,11,11,.45) 56%,transparent 84%)",
          }}
        />
        {/* público en silueta */}
        <svg
          className="absolute left-0 right-0 bottom-0 w-full z-[3]"
          style={{ height: 215 }}
          viewBox="0 0 1200 215"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="hero-rim" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E85A0C" stopOpacity=".85" />
              <stop offset="1" stopColor="#E85A0C" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,132 Q150,108 300,120 T600,116 T900,122 T1200,114"
            fill="none"
            stroke="url(#hero-rim)"
            strokeWidth="8"
            opacity=".85"
          />
          <g fill="#000">
            <path d="M0,215 L0,134 Q150,110 300,122 T600,118 T900,124 T1200,116 L1200,215 Z" />
            <circle cx="55" cy="124" r="14" />
            <circle cx="130" cy="132" r="12" />
            <circle cx="205" cy="119" r="15" />
            <circle cx="285" cy="130" r="13" />
            <circle cx="360" cy="121" r="14" />
            <circle cx="440" cy="132" r="12" />
            <circle cx="520" cy="117" r="15" />
            <circle cx="600" cy="128" r="13" />
            <circle cx="680" cy="121" r="14" />
            <circle cx="760" cy="132" r="12" />
            <circle cx="840" cy="118" r="15" />
            <circle cx="920" cy="129" r="13" />
            <circle cx="1000" cy="121" r="14" />
            <circle cx="1080" cy="131" r="12" />
            <circle cx="1155" cy="120" r="14" />
            <rect x="225" y="68" width="7" height="58" rx="3.5" transform="rotate(-8 228 97)" />
            <rect x="500" y="62" width="7" height="60" rx="3.5" transform="rotate(6 503 92)" />
            <rect x="835" y="66" width="7" height="58" rx="3.5" transform="rotate(-5 838 95)" />
            <rect x="660" y="72" width="7" height="52" rx="3.5" transform="rotate(10 663 98)" />
          </g>
          <circle cx="240" cy="64" r="2.8" fill="#F2742A" />
          <circle cx="515" cy="58" r="2.8" fill="#F7F7F7" opacity=".9" />
          <circle cx="850" cy="62" r="2.8" fill="#F2742A" />
          <circle cx="372" cy="70" r="2.2" fill="#F2742A" opacity=".8" />
        </svg>
      </div>

      {/* viñeta radial superior (oscurece bordes → foco al centro/texto) */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 40%, rgba(11,11,11,.85) 100%)",
        }}
      />
      {/* grano sutil */}
      <div
        aria-hidden
        className="absolute inset-0 z-[1] pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* ondas de frecuencia (estáticas, decorativas) */}
      <svg
        aria-hidden
        className="absolute left-0 right-0 z-[1] opacity-[0.18]"
        style={{ bottom: 60, height: 110 }}
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
      >
        <g fill="none" stroke="#E85A0C" strokeWidth="2">
          <path
            d="M0,60 Q60,4 120,60 T240,60 T360,60 T480,60 T600,60 T720,60 T840,60 T960,60 T1080,60 T1200,60"
            opacity=".7"
          />
          <path
            d="M0,84 Q60,40 120,84 T240,84 T360,84 T480,84 T600,84 T720,84 T840,84 T960,84 T1080,84 T1200,84"
            opacity=".35"
          />
        </g>
      </svg>

      {/* ── CONTENIDO ── */}
      <div className="relative z-10 w-full max-w-[1140px] mx-auto px-6 py-20">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-accent mb-[18px]">
          — The DJ OS · LATAM
        </div>
        <h1
          className="text-balance"
          style={{ fontFamily: ANTON, fontSize: "clamp(48px,8vw,104px)", lineHeight: 0.98, letterSpacing: ".005em" }}
        >
          TU{" "}
          <span className="inline-grid align-top">
            {[0, 1].map((i) => (
              <span
                key={i}
                className="[grid-area:1/1] text-accent origin-left transition-[opacity,transform] duration-[420ms] ease-out"
                style={{
                  opacity: i === cur ? 1 : 0,
                  transform: i === cur ? "none" : "scale(1.06)",
                  willChange: "opacity, transform",
                  backfaceVisibility: "hidden",
                }}
                aria-hidden={i === cur ? undefined : true}
              >
                {layers[i]}
              </span>
            ))}
          </span>
          <br />
          VIVE EN DROP<span className="text-accent">.</span>
        </h1>
        <p className="text-fg-muted max-w-[560px] mt-[22px] mb-8" style={{ fontSize: "clamp(15px,2vw,19px)" }}>
          El sistema operativo del DJ independiente. CRM, calendario con plata, press kit y growth —
          todo en una sola app.
        </p>
        <div className="flex flex-wrap gap-3.5">
          <Link
            href="/beta"
            className="inline-flex items-center gap-2 h-[50px] px-6 rounded-[12px] font-mono text-[12px] font-bold uppercase tracking-[0.07em] bg-accent text-ink border border-accent transition-colors hover:bg-[#F2742A] shadow-[0_6px_24px_-10px_rgba(232,90,12,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Soy DJ · Armar mi press kit →
          </Link>
          <Link
            href="/dj"
            className="inline-flex items-center gap-2 h-[50px] px-6 rounded-[12px] font-mono text-[12px] font-bold uppercase tracking-[0.07em] bg-transparent text-fg border border-border-strong transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Buscar DJs
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-9 gap-y-4 mt-12">
          {stats.map((s) => (
            <div key={s.l}>
              <div style={{ fontFamily: ANTON, fontSize: 32, lineHeight: 1 }}>
                {s.n}
                {s.suf && <span className="text-accent">{s.suf}</span>}
              </div>
              <div className="font-mono text-[10px] text-fg-subtle tracking-[0.08em] uppercase mt-0.5">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
