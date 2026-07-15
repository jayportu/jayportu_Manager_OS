"use client";

import { useState } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  ImageIcon,
  Inbox,
  Globe,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/**
 * "Míralo por dentro" (#3) — tour visual del producto con capturas REALES de
 * una cuenta demo (NOVA RÍOS, data ficticia limpia). Tabs a la izquierda, la
 * captura dentro de un marco de navegador a la derecha. Reusa el lenguaje de
 * FeatureTabs (tokens dark, fade al cambiar). Las imágenes viven en
 * /public/landing/product/<key>.png (1600×1000 aprox, capturadas de la demo).
 */
type Screen = {
  key: string;
  Icon: LucideIcon;
  label: string;
  benefit: string;
};

const SCREENS: Screen[] = [
  { key: "dashboard", Icon: LayoutDashboard, label: "Dashboard", benefit: "Tu semana de un vistazo: próximos shows, pendientes y cuánto tienes por cobrar." },
  { key: "crm", Icon: Users, label: "CRM de contactos", benefit: "Venues y bookers con puntaje y etapa. Sabes a quién seguir y cuándo." },
  { key: "calendario", Icon: CalendarDays, label: "Calendario + ingresos", benefit: "Tus fechas con lo cobrado y lo pendiente. Vista lista, mes y mapa." },
  { key: "presskit", Icon: ImageIcon, label: "Press kit público", benefit: "Bio, música, rider y disponibilidad en una página que compartes con un link." },
  { key: "inbox", Icon: Inbox, label: "Inbox de bookings", benefit: "Las solicitudes que llegan por tu press kit, con cotización y seguimiento." },
  { key: "perfil", Icon: Globe, label: "Tu perfil", benefit: "Todo lo que el booker ve de ti, editable en un solo lugar." },
  { key: "metricas", Icon: BarChart3, label: "Métricas", benefit: "Visitas, clics y solicitudes de tu press kit. Sabes si tu carrera crece." },
];

export function ProductShowcase() {
  const [active, setActive] = useState(0);
  const s = SCREENS[active];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
      {/* Tabs */}
      <div className="flex flex-col gap-2">
        {SCREENS.map((sc, i) => {
          const on = i === active;
          const Icon = sc.Icon;
          return (
            <button
              key={sc.key}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={on}
              className={`flex items-center gap-3 text-left border-l-2 px-4 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                on
                  ? "border-l-accent bg-white/[0.06] text-fg"
                  : "border-l-border text-fg-muted hover:text-fg hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`grid place-items-center w-[32px] h-[32px] rounded-[9px] shrink-0 transition-colors ${
                  on ? "bg-accent-soft text-accent" : "bg-white/[0.04] text-fg-subtle"
                }`}
              >
                <Icon className="w-[17px] h-[17px]" />
              </span>
              <span className="font-semibold text-[14px]">{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* Marco de navegador con la captura */}
      <div>
        <div className="overflow-hidden rounded-[14px] hos-glass shadow-2xl">
          {/* barra del navegador */}
          <div className="flex items-center gap-2 border-b border-border bg-white/[0.03] px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
            </span>
            <span className="ml-2 font-mono text-[10px] text-fg-subtle truncate">
              dropgigs.com/{s.key === "presskit" ? "p/nova-rios" : s.key}
            </span>
          </div>
          {/* captura — remonta con key para re-disparar el fade */}
          <div key={s.key} className="relative aspect-[16/10] motion-safe:animate-fpfade bg-bg">
            <Image
              src={`/landing/product/${s.key}.png`}
              alt={`DROP · ${s.label}`}
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              className="object-cover object-top"
            />
          </div>
        </div>
        <p className="text-fg-muted text-[14.5px] mt-4 max-w-[560px] leading-relaxed">
          {s.benefit}
        </p>
      </div>
    </div>
  );
}
