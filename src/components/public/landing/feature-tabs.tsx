"use client";

import { useState } from "react";
import {
  Users,
  Calendar,
  Image as ImageIcon,
  TrendingUp,
  Search,
  Music,
  type LucideIcon,
} from "lucide-react";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/**
 * "Todo lo que incluye" — tabs de features interactivos (spec:
 * MOCKUP_landing_v2.html). Click en una feature cambia el preview de la
 * derecha. Copy en tuteo chileno (no voseo). Tokens dark del rebrand.
 */
type Feature = { Icon: LucideIcon; t: string; d: string; p: string[] };

const FEATURES: Feature[] = [
  {
    Icon: Users,
    t: "CRM con scoring",
    d: "Tus venues y bookers ordenados, con un puntaje automático que te dice a quién priorizar y en qué etapa va cada trato.",
    p: ["Pipeline", "Score auto", "Follow-ups"],
  },
  {
    Icon: Calendar,
    t: "Calendario con plata",
    d: "Tus fechas, lo cobrado y lo pendiente en un solo lugar. Vista lista, mes y mapa de gigs.",
    p: ["Cobrado", "Pendiente", "Mes / Mapa"],
  },
  {
    Icon: ImageIcon,
    t: "Press kit que vende",
    d: "Bio, música, galería, rider y disponibilidad en una landing pública que compartes con un link.",
    p: ["Galería", "Tech rider", "Link público"],
  },
  {
    Icon: TrendingUp,
    t: "Growth tracking",
    d: "Seguidores, posts y campañas en un panel. Mide qué mueve la aguja de verdad.",
    p: ["IG", "YouTube", "SoundCloud"],
  },
  {
    Icon: Search,
    t: "Te encuentran los bookers",
    d: "Apareces en el directorio. Activa “disponible para tocar” y subes en las búsquedas con Smart Match.",
    p: ["Directorio", "Disponible", "LIVE"],
  },
  {
    Icon: Music,
    t: "Música embebida",
    d: "Tus sets de SoundCloud, YouTube y Spotify dentro del press kit. Sin subir archivos pesados.",
    p: ["SoundCloud", "YouTube", "Spotify"],
  },
];

export function FeatureTabs() {
  const [active, setActive] = useState(0);
  const f = FEATURES[active];
  const ActiveIcon = f.Icon;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      {/* Lista de tabs */}
      <div className="flex flex-col gap-2">
        {FEATURES.map((feat, i) => {
          const on = i === active;
          const Icon = feat.Icon;
          return (
            <button
              key={feat.t}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className={`flex items-center gap-3 text-left border-l-2 px-4 py-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                on
                  ? "border-l-accent bg-bg-panel text-fg"
                  : "border-l-border text-fg-muted hover:text-fg hover:bg-bg-panel"
              }`}
            >
              <span
                className={`grid place-items-center w-[34px] h-[34px] rounded-[9px] shrink-0 transition-colors ${
                  on ? "bg-accent-soft text-accent" : "bg-bg-subtle text-fg-subtle"
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
              <span className="font-semibold text-[14.5px]">{feat.t}</span>
            </button>
          );
        })}
      </div>

      {/* Preview */}
      <div className="relative overflow-hidden bg-bg-panel border border-border rounded-[16px] p-7 min-h-[300px]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 w-60 h-60 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(232,90,12,.13), transparent 70%)" }}
        />
        {/* key={active} → remonta y re-dispara el fade en cada cambio */}
        <div key={active} className="relative motion-safe:animate-fpfade">
          <span className="grid place-items-center w-14 h-14 rounded-[14px] bg-accent-soft text-accent mb-[18px]">
            <ActiveIcon className="w-7 h-7" />
          </span>
          <div style={{ fontFamily: ANTON, fontSize: 30, lineHeight: 0.95 }}>{f.t}</div>
          <p className="text-fg-muted text-[15px] mt-2.5 max-w-[460px] leading-relaxed">{f.d}</p>
          <div className="flex flex-wrap gap-2 mt-[18px]">
            {f.p.map((x) => (
              <span
                key={x}
                className="font-mono text-[10px] font-bold uppercase tracking-[0.05em] text-accent border border-accent/35 rounded-full px-[11px] py-[5px]"
              >
                {x}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
