"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/coming-soon";
import { NAV_GROUPS, filterNav, type NavGroup } from "@/lib/nav-config";
import { Logo } from "@/components/brand/logo";

/**
 * DROP. — Sidebar desktop (Hybrid OS · glass).
 * Panel frosted (blur + fondo semi-transparente, UNA sola capa de blur en el
 * `<aside>`) sobre el fondo oscuro de la app. Navegación tipo setlist
 * AGRUPADA por secciones (PERFIL · NEGOCIO · AGENDA · PRODUCCIÓN · SISTEMA),
 * item activo en bloque CLAY naranja (mismo lenguaje que
 * `_kit/shell.tsx`/`NavList`), sub-items anidados bajo su padre, watermark D.
 * de fondo, ticker vertical, LIVE + heartbeat, user card en clay al pie con
 * stats.
 *
 * Sólo visible en md+. En mobile se muestra Topbar + MobileMenu.
 *
 * Items con `comingSoon: true` muestran badge "pronto" y la página interna
 * renderiza <ComingSoon /> en lugar de la UI real (beta cerrada).
 */

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
  const navGroups: NavGroup[] = filterNav(NAV_GROUPS, { showLugares });
  const displayName = artistName && artistName.trim().length > 0
    ? artistName.trim().toUpperCase()
    : "TU NOMBRE";
  const avatarChar = displayName.charAt(0);

  // Foco visible naranja, consistente en todos los elementos interactivos
  // del sidebar (labels, caret, admin, perfil, contacto).
  const FOCUS_RING =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]";

  return (
    <aside
      className="hidden md:flex w-[260px] shrink-0 flex-col relative overflow-hidden border-r border-white/10 text-white h-full"
      style={{
        background: "rgba(18,18,18,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
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
          color: "rgb(var(--drop-orange) / 0.05)",
          letterSpacing: "-0.02em",
        }}
      >
        D.
      </span>

      {/* Vertical ticker tag */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none font-mono text-white/15"
        style={{
          left: "8px",
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
          fontSize: "8px",
          letterSpacing: "0.3em",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        v0.13 · BETA · DROP OS · LATAM
      </span>

      {/* Logo + LIVE indicator */}
      <div className="relative z-10 shrink-0 px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <Logo size={30} tone="cream" />
        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-orange flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse"
            aria-hidden="true"
          />
          LIVE
        </span>
      </div>

      {/* Manifesto block (donde irá próximo gig cuando haya data) */}
      <div className="relative z-10 shrink-0 px-5 py-3.5 bg-orange text-ink border-b border-white/10">
        <div className="font-mono text-[9px] font-bold tracking-[0.12em]">
          — THE DJ OS
        </div>
        <div className="mt-1.5 font-display text-[22px] leading-[0.95] tracking-[0.01em]">
          EL DJ EN CONTROL.
        </div>
        <div className="font-mono text-[10px] font-bold mt-1">
          CRM · GIGS · GROWTH
        </div>
      </div>

      {/* Nav agrupada por secciones (scrollea si es más alta que el espacio
          disponible). Los sub-items se revelan anidados bajo su padre cuando
          su acordeón está abierto (openItems). */}
      <nav
        className="relative z-10 flex flex-col flex-1 min-h-0 overflow-y-auto px-3 pb-2 gap-0.5"
        aria-label="Navegación"
      >
        <div className="flex items-center gap-2 px-2 pb-1 pt-4 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
          <span>NAVEGACIÓN</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        {navGroups.map((group, gi) => (
          <div key={group.section ?? `nav-top-${gi}`} className="mb-1">
            {group.section && (
              <div className="flex items-center gap-2 px-2 pb-1 pt-3 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/35">
                <span>{group.section}</span>
                <span className="h-px flex-1 bg-white/10" />
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
                      colapsa/expande el acordeón sin navegar. Activo = clay
                      naranja (mismo tratamiento que NavList del mockup). */}
                  <div
                    className={cn(
                      "grid grid-cols-[1fr_auto] items-center rounded-xl font-mono text-[11px] font-bold uppercase tracking-[0.06em] transition-colors",
                      isActive
                        ? "text-ink"
                        : "text-white/70 hover:bg-white/8 hover:text-white"
                    )}
                    style={
                      isActive
                        ? {
                            background: "rgb(var(--drop-orange))",
                            boxShadow:
                              "inset 0 1px 0 rgba(255,255,255,.4), 4px 4px 11px #070707",
                          }
                        : undefined
                    }
                  >
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl px-3 py-2 min-w-0",
                        FOCUS_RING
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn("shrink-0", isActive ? "text-ink" : "text-orange")}
                        strokeWidth={2.25}
                        width={15}
                        height={15}
                      />
                      <span className="truncate">{label}</span>
                      {comingSoon && (
                        <span className="ml-2 shrink-0">
                          <ComingSoonBadge text="PRÓXIMAMENTE" />
                        </span>
                      )}
                    </Link>
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleItem(href)}
                        aria-expanded={isOpen}
                        aria-label={`${isOpen ? "Colapsar" : "Expandir"} ${label}`}
                        className={cn(
                          "self-stretch flex items-center px-3 transition-colors",
                          !isActive && "text-white/40 hover:text-white",
                          FOCUS_RING
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
                    )}
                  </div>

                  {/* Sub-items: acordeón controlado por openItems[href]. */}
                  {hasChildren && isOpen && (
                    <div className="ml-4 mt-0.5 flex flex-col border-l border-white/12 pl-3">
                      {children!.map((child) => {
                        const childActive =
                          pathname === child.href ||
                          pathname.startsWith(child.href + "/");
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            aria-current={childActive ? "page" : undefined}
                            className={cn(
                              "py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors",
                              childActive
                                ? "text-orange"
                                : "text-white/50 hover:text-white",
                              FOCUS_RING
                            )}
                          >
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
        <div className="relative z-10 shrink-0 px-3 pt-2">
          <Link
            href="/admin"
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
              pathname.startsWith("/admin")
                ? "text-ink"
                : "border border-white/15 text-orange hover:bg-white/8",
              FOCUS_RING
            )}
            style={
              pathname.startsWith("/admin")
                ? {
                    background: "rgb(var(--drop-orange))",
                    boxShadow:
                      "inset 0 1px 0 rgba(255,255,255,.4), 4px 4px 11px #070707",
                  }
                : undefined
            }
          >
            + ADMIN · BACKSTAGE
          </Link>
        </div>
      )}

      {/* User card — siempre visible al pie del sidebar, en clay */}
      <div className="hos-clay relative z-10 shrink-0 m-3 rounded-2xl p-3">
        <div
          className="absolute -top-[8px] left-3 bg-ink px-1.5 font-mono text-[8px] font-bold text-orange"
          style={{ letterSpacing: "0.12em" }}
        >
          — ARTISTA
        </div>
        <Link
          href="/perfil"
          title="Editar perfil"
          className={cn(
            "flex items-center gap-2.5 -m-1 p-1 rounded-xl transition-colors hover:bg-white/8",
            FOCUS_RING
          )}
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
              className="w-[38px] h-[38px] rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-[38px] h-[38px] rounded-full bg-orange text-ink flex items-center justify-center shrink-0 font-display text-lg">
              {avatarChar}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-lg leading-none">
              {displayName}
            </div>
            <div className="font-mono text-[9px] text-white/40 mt-1 truncate tracking-wider">
              {userEmail || "DJ · LATAM"}
            </div>
          </div>
        </Link>
        <div className="grid grid-cols-2 gap-2 mt-3 border-t border-white/10 pt-2.5">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-wider text-white/40">
              Contactos
            </div>
            <div className="font-display text-lg leading-none mt-0.5">
              {contactCount ?? "—"}
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-wider text-white/40">
              Gigs · mes
            </div>
            <div className="font-display text-lg leading-none mt-0.5">
              {gigsThisMonth ?? "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Bloque contacto — link al correo oficial siempre visible al pie */}
      <div className="relative z-10 shrink-0 mx-3 mb-3 px-3 py-2.5 border-t border-white/10">
        <a
          href="mailto:hola@dropgigs.com"
          className={cn(
            "block group transition-opacity hover:opacity-100 opacity-80",
            FOCUS_RING
          )}
        >
          <div
            className="font-mono text-[8px] text-white/40 group-hover:text-orange transition-colors"
            style={{ letterSpacing: "0.08em" }}
          >
            <span className="text-orange">→</span>&nbsp; CONTACTO
          </div>
          <div className="text-white font-mono text-[11px] mt-1 group-hover:text-orange transition-colors truncate">
            hola@dropgigs.com
          </div>
        </a>
      </div>
    </aside>
  );
}
