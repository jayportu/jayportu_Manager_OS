"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/coming-soon";

/**
 * DROP. — Sidebar desktop (Type Beat brutalist poster).
 * Fondo INK, navegación tipo setlist con dash, item activo en bloque ORANGE,
 * watermark D. de fondo, user card al pie con stats.
 *
 * Sólo visible en md+. En mobile se muestra Topbar + BottomNav.
 *
 * Items con `comingSoon: true` muestran badge "pronto" y la página interna
 * renderiza <ComingSoon /> en lugar de la UI real (beta cerrada).
 */

interface NavItem {
  href: string;
  label: string;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/crm", label: "CRM" },
  { href: "/descubrir", label: "Descubrir" },
  { href: "/campanas", label: "Campañas" },
  { href: "/calendario", label: "Calendario" },
  { href: "/press-kit", label: "Press kit" },
  { href: "/plantillas", label: "Plantillas" },
  { href: "/gmail", label: "Gmail" },
  { href: "/growth", label: "Growth" },
  { href: "/ia", label: "IA · Strategy" },
  { href: "/configuracion", label: "Configuración" },
];

interface SidebarProps {
  userEmail?: string;
  isAdmin?: boolean;
  artistName?: string | null;
}

export function Sidebar({
  userEmail,
  isAdmin = false,
  artistName,
}: SidebarProps) {
  const pathname = usePathname();
  const displayName = artistName && artistName.trim().length > 0
    ? artistName.trim().toUpperCase()
    : "TU NOMBRE";
  const avatarChar = displayName.charAt(0);

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-ink text-cream relative overflow-hidden border-r-2 border-orange h-full">
      {/* Watermark D. de fondo */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{
          bottom: "-60px",
          right: "-40px",
          fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
          fontSize: "320px",
          lineHeight: 0.75,
          color: "rgba(255, 92, 0, 0.05)",
          letterSpacing: "-0.02em",
        }}
      >
        D.
      </span>

      {/* Vertical ticker tag */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none font-mono"
        style={{
          left: "8px",
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
          fontSize: "8px",
          color: "#333",
          letterSpacing: "0.3em",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        v0.13 · BETA · DROP OS · LATAM
      </span>

      {/* Logo + LIVE indicator */}
      <div className="relative z-10 shrink-0 px-[22px] pt-[22px] pb-[18px] border-b-2 border-orange flex items-start justify-between">
        <span
          className="select-none"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "56px",
            lineHeight: 0.78,
            color: "#F4EFE7",
            letterSpacing: "-0.01em",
          }}
        >
          DROP<span style={{ color: "#FF5C00" }}>.</span>
        </span>
        <span className="font-mono text-[9px] font-bold tracking-[0.1em] text-orange flex items-center gap-[5px]">
          <span
            className="w-[7px] h-[7px] bg-orange rounded-full animate-blink"
            aria-hidden="true"
          />
          LIVE
        </span>
      </div>

      {/* Manifesto block (donde irá próximo gig cuando haya data) */}
      <div className="relative z-10 shrink-0 px-[22px] py-[14px] bg-orange text-ink border-b-2 border-ink">
        <div className="font-mono text-[9px] font-bold tracking-[0.12em]">
          — THE DJ OS
        </div>
        <div
          className="mt-[6px]"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "22px",
            lineHeight: 0.95,
            letterSpacing: "0.01em",
          }}
        >
          EL DJ EN CONTROL.
        </div>
        <div className="font-mono text-[10px] font-bold mt-[4px]">
          CRM · GIGS · GROWTH
        </div>
      </div>

      {/* Section header */}
      <div className="relative z-10 shrink-0 px-[22px] pt-[18px] pb-[6px] flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.14em] text-[#555]">
        <span>NAVEGACIÓN</span>
        <span className="flex-1 h-px bg-[#2a2a2a]" />
      </div>

      {/* Nav items (scrollea si el nav es más alto que el espacio disponible) */}
      <nav className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, comingSoon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-[22px] py-[9px] grid grid-cols-[1fr_auto] gap-[10px] items-center transition-colors font-mono text-[12px] font-bold uppercase tracking-[0.08em] border-l-[3px] border-transparent",
                isActive
                  ? "bg-orange text-ink border-l-ink"
                  : "text-[#aaa] hover:text-cream"
              )}
            >
              <span className="flex items-center gap-2">
                {label}
                {comingSoon && <ComingSoonBadge />}
              </span>
              <span aria-hidden="true">{isActive ? "◉" : ""}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-[10px] mx-[22px] border-t-2 border-dashed border-[#2a2a2a]" />
            <Link
              href="/admin"
              className={cn(
                "mx-[22px] px-3 py-[7px] border border-orange font-mono text-[10px] font-bold uppercase tracking-[0.1em] flex items-center gap-2",
                pathname.startsWith("/admin")
                  ? "bg-orange text-ink"
                  : "text-orange hover:bg-orange hover:text-ink"
              )}
            >
              + ADMIN · BACKSTAGE
            </Link>
          </>
        )}
      </nav>

      {/* User card — siempre visible al pie del sidebar */}
      <div className="relative z-10 shrink-0 m-[14px] p-[14px] bg-[#161616] border border-[#2a2a2a]">
        <div
          className="absolute -top-[8px] left-[12px] bg-ink px-[6px] font-mono text-[8px] font-bold text-orange"
          style={{ letterSpacing: "0.12em" }}
        >
          — ARTISTA
        </div>
        <div className="flex items-center gap-[10px]">
          <div
            className="w-[38px] h-[38px] bg-orange text-ink flex items-center justify-center"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "22px",
              lineHeight: 0.85,
            }}
          >
            {avatarChar}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="text-cream truncate"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "18px",
                lineHeight: 0.9,
              }}
            >
              {displayName}
            </div>
            <div className="font-mono text-[8px] text-[#666] mt-[2px] truncate" style={{ letterSpacing: "0.04em" }}>
              {userEmail || "DJ · LATAM"}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 border-t border-[#2a2a2a] pt-[10px]">
          <div>
            <div className="font-mono text-[8px] text-[#666]" style={{ letterSpacing: "0.08em" }}>
              CONTACTOS
            </div>
            <div
              className="text-cream"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "18px",
                lineHeight: 0.9,
                marginTop: "2px",
              }}
            >
              —
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] text-[#666]" style={{ letterSpacing: "0.08em" }}>
              GIGS · MES
            </div>
            <div
              className="text-cream"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "18px",
                lineHeight: 0.9,
                marginTop: "2px",
              }}
            >
              —
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
