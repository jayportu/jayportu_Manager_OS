"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/coming-soon";
import {
  LayoutDashboard,
  Users,
  Compass,
  Megaphone,
  CalendarDays,
  FileImage,
  LayoutTemplate,
  Mail,
  TrendingUp,
  Settings,
  Building2,
  type LucideIcon,
} from "lucide-react";

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
  icon: LucideIcon;
  comingSoon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/descubrir", label: "Descubrir", icon: Compass },
  { href: "/lugares", label: "Lugares", icon: Building2 },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/press-kit", label: "Press kit", icon: FileImage },
  { href: "/plantillas", label: "Plantillas", icon: LayoutTemplate },
  { href: "/gmail", label: "Correo", icon: Mail },
  { href: "/growth", label: "Growth", icon: TrendingUp },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

interface SidebarProps {
  userEmail?: string;
  isAdmin?: boolean;
  artistName?: string | null;
  avatarUrl?: string | null;
  /** Total de contactos del CRM. undefined → "—". */
  contactCount?: number;
  /** Gigs (shows) agendados en el mes actual. undefined → "—". */
  gigsThisMonth?: number;
  /** "Lugares" solo se muestra si hay venues verificados (si no, lleva a página vacía). */
  showLugares?: boolean;
}

export function Sidebar({
  userEmail,
  isAdmin = false,
  artistName,
  avatarUrl,
  contactCount,
  gigsThisMonth,
  showLugares = true,
}: SidebarProps) {
  const pathname = usePathname();
  const navItems = showLugares
    ? NAV_ITEMS
    : NAV_ITEMS.filter((i) => i.href !== "/lugares");
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
          className="select-none animate-logo-strobe"
          style={{
            fontFamily: "var(--font-satoshi), system-ui, sans-serif",
            fontSize: "56px",
            fontWeight: 900,
            lineHeight: 0.9,
            color: "#F4EFE7",
            letterSpacing: "-0.02em",
          }}
        >
          DROP<span style={{ color: "#FF5C00", marginLeft: "-0.06em" }}>.</span>
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
        {navItems.map(({ href, label, icon: Icon, comingSoon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group px-[22px] py-[9px] grid grid-cols-[1fr_auto] gap-[10px] items-center transition-colors font-mono text-[12px] font-bold uppercase tracking-[0.08em] border-l-[3px] border-transparent",
                isActive
                  ? "bg-orange text-ink border-l-ink"
                  : "text-[#aaa] hover:text-cream"
              )}
            >
              <span className="flex items-center">
                {/* Slide-in icon: oculto por default, entra desde la izquierda
                    en hover/active. Naranja sobre fondo ink, ink sobre fondo
                    naranja (item activo). */}
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "shrink-0 overflow-hidden -translate-x-2 opacity-0 w-0 transition-all duration-200 ease-out",
                    "group-hover:translate-x-0 group-hover:opacity-100 group-hover:w-[16px] group-hover:mr-2",
                    isActive
                      ? "translate-x-0 opacity-100 w-[16px] mr-2 text-ink"
                      : "text-orange"
                  )}
                  strokeWidth={2.25}
                  width={16}
                  height={16}
                />
                {label}
                {comingSoon && <ComingSoonBadge />}
              </span>
              <span aria-hidden="true">{isActive ? "◉" : ""}</span>
            </Link>
          );
        })}

      </nav>

      {/* Admin · Backstage — bloque FIJO (shrink-0), siempre visible. Antes
          vivía dentro del <nav> scrolleable y en pantallas bajas quedaba al
          fondo del scroll, tapado por la card de artista. */}
      {isAdmin && (
        <div className="relative z-10 shrink-0 px-[14px] pt-[12px]">
          <Link
            href="/admin"
            className={cn(
              "flex items-center justify-center gap-2 px-3 py-[8px] border border-orange font-mono text-[10px] font-bold uppercase tracking-[0.1em]",
              pathname.startsWith("/admin")
                ? "bg-orange text-ink"
                : "text-orange hover:bg-orange hover:text-ink"
            )}
          >
            + ADMIN · BACKSTAGE
          </Link>
        </div>
      )}

      {/* User card — siempre visible al pie del sidebar */}
      <div className="relative z-10 shrink-0 m-[14px] p-[14px] bg-[#161616] border border-[#2a2a2a]">
        <div
          className="absolute -top-[8px] left-[12px] bg-ink px-[6px] font-mono text-[8px] font-bold text-orange"
          style={{ letterSpacing: "0.12em" }}
        >
          — ARTISTA
        </div>
        <Link
          href="/perfil"
          title="Editar perfil"
          className="flex items-center gap-[10px] -m-1 p-1 transition-colors hover:bg-[#202020]"
        >
          {avatarUrl ? (
            // next/image → Vercel optimiza a 38px y cachea en su CDN, así
            // Supabase Storage solo sirve el original una vez (no en cada
            // navegación). Clave para no reventar el egress del plan free.
            <Image
              src={avatarUrl}
              alt={displayName}
              width={38}
              height={38}
              className="w-[38px] h-[38px] object-cover shrink-0"
            />
          ) : (
            <div
              className="w-[38px] h-[38px] bg-orange text-ink flex items-center justify-center shrink-0"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "22px",
                lineHeight: 0.85,
              }}
            >
              {avatarChar}
            </div>
          )}
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
        </Link>
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
              {contactCount ?? "—"}
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
              {gigsThisMonth ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Bloque contacto — link al correo oficial siempre visible al pie */}
      <div className="relative z-10 shrink-0 mx-[14px] mb-[14px] px-[14px] py-[10px] border-t border-[#2a2a2a]">
        <a
          href="mailto:hola@dropgigs.com"
          className="block group transition-opacity hover:opacity-100 opacity-80"
        >
          <div
            className="font-mono text-[8px] text-[#666] group-hover:text-orange transition-colors"
            style={{ letterSpacing: "0.08em" }}
          >
            <span className="text-orange">→</span>&nbsp; CONTACTO
          </div>
          <div className="text-cream font-mono text-[11px] mt-[3px] group-hover:text-orange transition-colors truncate">
            hola@dropgigs.com
          </div>
        </a>
      </div>
    </aside>
  );
}
