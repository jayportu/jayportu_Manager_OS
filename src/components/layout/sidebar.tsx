"use client";

import { useState } from "react";
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
  User,
  SlidersHorizontal,
  Link2,
  Share2,
  Ticket,
  ListChecks,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

/**
 * DROP. — Sidebar desktop (Type Beat brutalist poster).
 * Fondo INK, navegación tipo setlist con dash AGRUPADA por secciones
 * (PERFIL · NEGOCIO · AGENDA · PRODUCCIÓN · SISTEMA), item activo en bloque
 * ORANGE, sub-items anidados bajo su padre, watermark D. de fondo, user card
 * al pie con stats.
 *
 * Sólo visible en md+. En mobile se muestra Topbar + MobileMenu.
 *
 * Items con `comingSoon: true` muestran badge "pronto" y la página interna
 * renderiza <ComingSoon /> en lugar de la UI real (beta cerrada).
 */

interface NavChild {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  children?: NavChild[];
}

interface NavGroup {
  /** Cabecera de sección (mono, mayúsculas). Sin section = bloque suelto arriba. */
  section?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "PERFIL",
    items: [
      { href: "/perfil", label: "Perfil", icon: User },
      {
        href: "/press-kit",
        label: "Press kit",
        icon: FileImage,
        children: [
          { href: "/press-kit/stats", label: "Estadísticas" },
          // El inbox de bookings vive dentro de /press-kit (el índice
          // /press-kit/bookings redirige ahí). Apuntamos al padre.
          { href: "/press-kit", label: "Bookings" },
        ],
      },
      { href: "/redes", label: "Redes & Cuentas", icon: Share2 },
      { href: "/link-in-bio", label: "Link-in-bio", icon: Link2 },
    ],
  },
  {
    section: "NEGOCIO",
    items: [
      {
        href: "/crm",
        label: "CRM",
        icon: Users,
        children: [{ href: "/crm/recurrentes", label: "Recurrentes" }],
      },
      { href: "/descubrir", label: "Descubrir", icon: Compass },
      { href: "/campanas", label: "Campañas", icon: Megaphone },
      { href: "/gmail", label: "Correo", icon: Mail },
      { href: "/plantillas", label: "Plantillas", icon: LayoutTemplate },
      // "Lugares" se filtra si no hay venues verificados (ver showLugares).
      { href: "/lugares", label: "Lugares", icon: Building2 },
      { href: "/convocatorias", label: "Convocatorias", icon: Ticket, comingSoon: true },
    ],
  },
  {
    section: "AGENDA",
    items: [
      { href: "/calendario", label: "Calendario", icon: CalendarDays },
      {
        href: "/growth",
        label: "Growth",
        icon: TrendingUp,
        children: [
          { href: "/growth/posts", label: "Posts" },
          { href: "/growth/ads", label: "Ads" },
        ],
      },
      { href: "/tareas", label: "Tareas", icon: ListChecks },
    ],
  },
  {
    section: "PRODUCCIÓN",
    // Tech rider vive dentro de Configuración; lo surfaceamos con ancla directa.
    items: [
      { href: "/configuracion#tech-rider", label: "Tech rider", icon: SlidersHorizontal },
    ],
  },
  {
    section: "AYUDA",
    items: [{ href: "/soporte", label: "Soporte", icon: LifeBuoy, comingSoon: true }],
  },
  {
    section: "SISTEMA",
    items: [{ href: "/configuracion", label: "Configuración", icon: Settings }],
  },
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
  // Acordeón: los grupos con hijos arrancan COLAPSADOS; se expanden al
  // presionar el caret. El estado vive en memoria del sidebar → persiste
  // entre navegaciones (el layout no se re-monta); se reinicia al recargar.
  // El label navega; el caret sólo colapsa/expande.
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV_GROUPS.flatMap((g) => g.items)
        .filter((i) => i.children && i.children.length > 0)
        .map((i) => [i.href, false])
    )
  );
  const toggleItem = (href: string) =>
    setOpenItems((prev) => ({ ...prev, [href]: !prev[href] }));
  const navGroups: NavGroup[] = NAV_GROUPS.map((g) => ({
    ...g,
    items: showLugares ? g.items : g.items.filter((i) => i.href !== "/lugares"),
  })).filter((g) => g.items.length > 0);
  const displayName = artistName && artistName.trim().length > 0
    ? artistName.trim().toUpperCase()
    : "TU NOMBRE";
  const avatarChar = displayName.charAt(0);

  return (
    <aside className="hidden md:flex w-[260px] shrink-0 flex-col bg-ink text-white relative overflow-hidden border-r-2 border-orange h-full">
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
          DROP<span style={{ color: "#E85A0C", marginLeft: "-0.06em" }}>.</span>
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
      <div className="relative z-10 shrink-0 px-[22px] py-[14px] bg-orange text-ink border-b-2 border-border">
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

      {/* Nav agrupada por secciones (scrollea si es más alta que el espacio
          disponible). Los sub-items se revelan anidados bajo su padre cuando
          la sección de ese padre está activa. */}
      <nav className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto pb-2">
        {navGroups.map((group, gi) => (
          <div key={group.section ?? `nav-top-${gi}`}>
            {group.section && (
              <div className="px-[22px] pt-[15px] pb-[5px] flex items-center gap-2 font-mono text-[9px] font-bold tracking-[0.14em] text-[#555]">
                <span>{group.section}</span>
                <span className="flex-1 h-px bg-[#242424]" />
              </div>
            )}
            {group.items.map(({ href, label, icon: Icon, comingSoon, children }) => {
              // Ítems con ancla (#) son atajos: nunca se marcan activos por ruta.
              const isHash = href.includes("#");
              const isActive =
                !isHash &&
                (pathname === href ||
                  (href !== "/dashboard" && pathname.startsWith(href)));
              const hasChildren = !!(children && children.length > 0);
              const isOpen = hasChildren ? !!openItems[href] : false;
              return (
                <div key={href}>
                  {/* Fila del ítem: el label (Link) navega; el caret (button)
                      colapsa/expande el acordeón sin navegar. */}
                  <div
                    className={cn(
                      "grid grid-cols-[1fr_auto] items-center transition-colors font-mono text-[12px] font-bold uppercase tracking-[0.08em] border-l-[3px]",
                      isActive
                        ? "bg-orange text-ink border-l-border"
                        : "text-[#aaa] border-transparent"
                    )}
                  >
                    <Link
                      href={href}
                      className={cn(
                        "group px-[22px] py-[9px] flex items-center min-w-0",
                        !isActive && "hover:text-white"
                      )}
                    >
                      {/* Slide-in icon: oculto por default, entra desde la izquierda
                          en hover/active. Naranja sobre fondo ink, ink sobre fondo
                          naranja (item activo). */}
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "shrink-0 overflow-hidden -translate-x-2 opacity-0 w-0 transition-all duration-200 ease-out",
                          "group-hover:translate-x-0 group-hover:opacity-100 group-hover:w-[16px] group-hover:mr-2",
                          isActive
                            ? "translate-x-0 opacity-100 w-[16px] mr-2 text-fg"
                            : "text-orange"
                        )}
                        strokeWidth={2.25}
                        width={16}
                        height={16}
                      />
                      <span className="truncate">{label}</span>
                      {comingSoon && (
                        <span className="ml-2 shrink-0">
                          <ComingSoonBadge text="PRÓXIMAMENTE" />
                        </span>
                      )}
                    </Link>
                    {hasChildren ? (
                      <button
                        type="button"
                        onClick={() => toggleItem(href)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Colapsar" : "Expandir"} ${label}`}
                        className={cn(
                          "self-stretch flex items-center px-[16px] transition-colors",
                          isActive ? "text-ink" : "text-[#777] hover:text-white"
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "text-[13px] leading-none transition-transform duration-150",
                            isOpen && "rotate-90"
                          )}
                        >
                          ›
                        </span>
                      </button>
                    ) : (
                      <span aria-hidden="true" className="pl-[10px] pr-[22px]">
                        {isActive ? "◉" : ""}
                      </span>
                    )}
                  </div>

                  {/* Sub-items: acordeón controlado por openItems[href]. */}
                  {hasChildren && isOpen && (
                    <div className="bg-[#0d0d0d]">
                      {children!.map((child) => {
                        const childActive =
                          pathname === child.href ||
                          pathname.startsWith(child.href + "/");
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center gap-2 pl-[42px] pr-[22px] py-[7px] font-mono text-[10.5px] font-bold uppercase tracking-[0.06em] border-l-[3px] border-transparent transition-colors",
                              childActive
                                ? "text-orange"
                                : "text-[#8a8a8a] hover:text-white"
                            )}
                          >
                            <span aria-hidden="true" className="text-[#3a3a3a]">
                              └
                            </span>
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
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
              className="text-white truncate"
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
              className="text-white"
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
              className="text-white"
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
          <div className="text-white font-mono text-[11px] mt-[3px] group-hover:text-orange transition-colors truncate">
            hola@dropgigs.com
          </div>
        </a>
      </div>
    </aside>
  );
}
