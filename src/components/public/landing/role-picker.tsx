import Link from "next/link";
import { Disc3, Handshake, Camera, Clapperboard, type LucideIcon } from "lucide-react";

const ANTON = "var(--font-anton), Impact, system-ui, sans-serif";

/**
 * "Elige tu perfil" del landing. DJ y Booker son links reales (→ /beta y
 * → /signup/booker); los roles creativos (fotógrafo/audiovisual) siguen como
 * "próximamente" para comunicar la visión sin ofrecer un signup que aún no
 * existe. Server component — sin JS de cliente.
 */
type Role = {
  icon: LucideIcon;
  title: string;
  desc: string;
  active?: boolean;
  href?: string;
  cta?: string;
};

const ROLES: Role[] = [
  {
    icon: Disc3,
    title: "DJ",
    desc: "Press kit, CRM, agenda con tus ingresos y growth — todo en una app.",
    active: true,
    href: "/beta",
    cta: "Armar mi press kit →",
  },
  {
    icon: Handshake,
    title: "Booker",
    desc: "Encuentra y contrata al talento indicado para tu evento.",
    active: true,
    href: "/signup/booker",
    cta: "Encontrar mi DJ →",
  },
  {
    icon: Camera,
    title: "Fotógrafo",
    desc: "Portafolio, bookings y difusión para tu lente.",
  },
  {
    icon: Clapperboard,
    title: "Audiovisual",
    desc: "VJ, reels y contenido para la escena.",
  },
];

export function RolePicker() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {ROLES.map((r) => {
        const Icon = r.icon;
        const active = !!r.active;
        const cls = `flex flex-col rounded-[14px] border p-6 min-h-[224px] ${
          active
            ? "bg-bg-panel border-accent transition-[transform,box-shadow] duration-300 hover:scale-[1.03] hover:shadow-[0_24px_60px_-24px_rgba(232,90,12,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            : "bg-bg-panel/40 border-border cursor-default select-none"
        }`;
        const inner = (
          <>
            <div className="flex items-start justify-between">
              <Icon
                className={active ? "text-accent" : "text-fg-subtle"}
                style={{ width: 28, height: 28 }}
                strokeWidth={1.5}
                aria-hidden
              />
              <span
                className={`font-mono text-[9px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border ${
                  active ? "border-accent text-accent" : "border-border text-fg-subtle"
                }`}
              >
                {active ? "Disponible" : "Próximamente"}
              </span>
            </div>
            <div className="uppercase mt-5" style={{ fontFamily: ANTON, fontSize: 30, lineHeight: 0.95 }}>
              {r.title}
              <span className="text-accent">.</span>
            </div>
            <p className={`text-[13px] mt-2 flex-1 ${active ? "text-fg-muted" : "text-fg-subtle"}`}>
              {r.desc}
            </p>
            <div
              className={`font-mono text-[11px] font-bold uppercase tracking-[0.08em] mt-5 ${
                active ? "text-accent" : "text-fg-subtle/70"
              }`}
            >
              {active ? r.cta : "Muy pronto"}
            </div>
          </>
        );
        return active ? (
          <Link key={r.title} href={r.href!} className={cls}>
            {inner}
          </Link>
        ) : (
          <div key={r.title} className={cls} aria-disabled>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
