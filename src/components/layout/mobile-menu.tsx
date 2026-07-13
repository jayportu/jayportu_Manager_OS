"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/coming-soon";
import { X } from "lucide-react";
import { NAV_GROUPS, filterNav } from "@/lib/nav-config";

/**
 * Evento que el Topbar dispara desde su botón hamburguesa para abrir este
 * menú. Mantiene Topbar (client) y MobileMenu (client) desacoplados — no
 * necesitamos un store/contexto compartido para algo tan simple.
 */
export const MOBILE_MENU_OPEN_EVENT = "drop:mobile-menu-open";

/**
 * Menú mobile · drawer desplegable que reemplaza el BottomNav (Hybrid OS ·
 * glass). Panel frosted (blur + fondo semi-transparente, UNA sola capa de
 * blur en el `<aside>`) sobre el backdrop oscuro — mismo lenguaje que
 * `src/components/layout/sidebar.tsx` y `_kit/shell.tsx` (drawer mobile).
 *
 * Mismo set de items y mismos íconos que el sidebar desktop, en formato
 * lista vertical, item activo en bloque CLAY naranja. El bloque de Artista
 * al pie es clickeable → /perfil (igual que en el sidebar).
 *
 * Trigger: el botón hamburguesa vive en Topbar, posicionado para encajar en
 * la zona izquierda del Topbar mobile. Se abre con click, se cierra con X,
 * click en backdrop, ESC, o al cambiar de ruta.
 */

interface MobileMenuProps {
  userEmail?: string;
  isAdmin?: boolean;
  artistName?: string | null;
  avatarUrl?: string | null;
  /** "Lugares" solo se muestra si hay venues verificados (mismo valor que Sidebar). */
  showLugares?: boolean;
}

// Foco visible naranja, consistente con Sidebar/Topbar.
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]";

export function MobileMenu({
  userEmail,
  isAdmin = false,
  artistName,
  avatarUrl,
  showLugares = true,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // Acordeón (mismo comportamiento que el sidebar desktop): los grupos con
  // hijos arrancan COLAPSADOS; se expanden al presionar el caret. Persiste
  // mientras el drawer esté montado.
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NAV_GROUPS.flatMap((g) => g.items)
        .filter((i) => i.children && i.children.length > 0)
        .map((i) => [i.href, false])
    )
  );
  const toggleItem = (href: string) =>
    setOpenItems((prev) => ({ ...prev, [href]: !prev[href] }));
  const navGroups = filterNav(NAV_GROUPS, { showLugares });

  const displayName =
    artistName && artistName.trim().length > 0
      ? artistName.trim().toUpperCase()
      : "TU NOMBRE";
  const avatarChar = displayName.charAt(0);

  // Cerrar al cambiar de ruta
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll + ESC para cerrar mientras está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Trigger desde Topbar (custom event para no acoplar componentes server↔client)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(MOBILE_MENU_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(MOBILE_MENU_OPEN_EVENT, onOpen);
  }, []);

  return (
    <>
      {/* Backdrop — dim plano, sin blur (el blur vive solo en el panel) */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[60] bg-ink/70 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer — panel glass frosted (única capa de blur) */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-[70] w-[280px] max-w-[85vw] text-white border-r border-white/10 flex flex-col overflow-hidden transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: "rgba(16,16,16,0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        {/* Header naranja con close */}
        <div
          className="shrink-0 px-[18px] py-[14px] bg-orange text-ink border-b-2 border-white/10 flex items-center justify-between"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
        >
          <div>
            <div className="font-mono text-[9px] font-bold tracking-[0.12em]">
              — THE DJ OS
            </div>
            <div
              className="mt-[4px]"
              style={{
                fontFamily: "var(--font-satoshi), system-ui, sans-serif",
                fontSize: "22px",
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
              }}
            >
              DROP<span style={{ color: "#0A0A0A", marginLeft: "-0.06em" }}>.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className={cn(
              "h-9 w-9 flex items-center justify-center border-2 border-border hover:bg-ink hover:text-orange transition-colors",
              FOCUS_RING
            )}
          >
            <X className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Nav agrupada (mismo agrupamiento que sidebar desktop) */}
        <nav className="flex-1 overflow-y-auto py-2 px-3" aria-label="Navegación">
          {navGroups.map((group, gi) => (
            <div key={group.section ?? `m-top-${gi}`}>
              {group.section && (
                <div className="flex items-center gap-2 px-2 pt-3 pb-1 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-white/35">
                  <span>{group.section}</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>
              )}
              {group.items.map(({ href, label, icon: Icon, comingSoon, children }) => {
                const isHash = href.includes("#");
                const isActive =
                  !isHash &&
                  (pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href)));
                const hasChildren = !!(children && children.length > 0);
                const isOpen = hasChildren ? !!openItems[href] : false;
                return (
                  <div key={href}>
                    {/* Fila: el label (Link) navega; el caret (button) togglea.
                        Activo = clay naranja (mismo tratamiento que Sidebar/
                        NavList del kit). */}
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_auto] items-center rounded-xl transition-colors",
                        isActive ? "text-ink" : "text-white/70"
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
                          "flex items-center gap-2.5 rounded-xl px-3 py-3 min-w-0 font-mono text-[12px] font-bold uppercase tracking-[0.08em]",
                          !isActive && "hover:bg-white/8 hover:text-white",
                          FOCUS_RING
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-ink" : "text-orange"
                          )}
                          strokeWidth={2.25}
                        />
                        <span className="truncate">{label}</span>
                        {comingSoon && (
                          <span className="shrink-0">
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
                            isActive ? "text-ink" : "text-white/40 hover:text-white",
                            FOCUS_RING
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "text-[14px] leading-none transition-transform duration-150",
                              isOpen && "rotate-90"
                            )}
                          >
                            ›
                          </span>
                        </button>
                      )}
                    </div>

                    {hasChildren && isOpen && (
                      <div className="ml-4 mt-0.5 mb-1 flex flex-col border-l border-white/12 pl-3">
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
                                "py-2 font-mono text-[11px] font-bold uppercase tracking-wider transition-colors",
                                childActive
                                  ? "text-orange"
                                  : "text-white/50 hover:text-white",
                                FOCUS_RING
                              )}
                            >
                              <span className="truncate">{child.label}</span>
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

          {isAdmin && (
            <>
              <div className="my-[10px] border-t-2 border-dashed border-white/10" />
              <Link
                href="/admin"
                aria-current={pathname.startsWith("/admin") ? "page" : undefined}
                className={cn(
                  "mb-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
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
            </>
          )}
        </nav>

        {/* Artist card al pie — clickeable → /perfil, clay (mirror desktop) */}
        <Link
          href="/perfil"
          className={cn(
            "hos-clay shrink-0 m-3 rounded-2xl p-3 relative transition-opacity hover:opacity-90",
            FOCUS_RING
          )}
        >
          <div
            className="absolute -top-[8px] left-[12px] bg-ink px-[6px] font-mono text-[8px] font-bold text-orange"
            style={{ letterSpacing: "0.12em" }}
          >
            — ARTISTA
          </div>
          <div className="flex items-center gap-[10px]">
            {avatarUrl ? (
              // next/image → optimizado a 38px + cacheado en CDN de Vercel
              // (mismo motivo que el sidebar: bajar egress de Supabase).
              <Image
                src={avatarUrl}
                alt={displayName}
                width={38}
                height={38}
                className="w-[38px] h-[38px] rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-[38px] h-[38px] rounded-full bg-orange text-ink flex items-center justify-center shrink-0"
                style={{
                  fontFamily:
                    "var(--font-anton), Impact, system-ui, sans-serif",
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
                  fontFamily:
                    "var(--font-anton), Impact, system-ui, sans-serif",
                  fontSize: "16px",
                  lineHeight: 0.9,
                }}
              >
                {displayName}
              </div>
              <div
                className="font-mono text-[8px] text-white/40 mt-[2px] truncate"
                style={{ letterSpacing: "0.04em" }}
              >
                {userEmail || "DJ · LATAM"}
              </div>
            </div>
          </div>
        </Link>

        {/* Bloque contacto — mirror del sidebar desktop */}
        <a
          href="mailto:hola@dropgigs.com"
          className={cn(
            "block shrink-0 mx-3 mb-3 px-[14px] py-[10px] border-t border-white/10 group transition-opacity hover:opacity-100 opacity-80",
            FOCUS_RING
          )}
        >
          <div
            className="font-mono text-[8px] text-white/40 group-hover:text-orange transition-colors"
            style={{ letterSpacing: "0.08em" }}
          >
            <span className="text-orange">→</span>&nbsp; CONTACTO
          </div>
          <div className="text-white font-mono text-[11px] mt-[3px] group-hover:text-orange transition-colors truncate">
            hola@dropgigs.com
          </div>
        </a>
      </aside>
    </>
  );
}
