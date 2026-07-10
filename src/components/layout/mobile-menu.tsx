"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ComingSoonBadge } from "@/components/coming-soon";
import {
  X,
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
 * Evento que el Topbar dispara desde su botón hamburguesa para abrir este
 * menú. Mantiene Topbar (client) y MobileMenu (client) desacoplados — no
 * necesitamos un store/contexto compartido para algo tan simple.
 */
export const MOBILE_MENU_OPEN_EVENT = "drop:mobile-menu-open";

/**
 * Menú mobile · drawer desplegable que reemplaza el BottomNav.
 *
 * Mismo set de items y mismos íconos que el sidebar desktop, en formato
 * lista vertical. El bloque de Artista al pie es clickeable → /perfil
 * (igual que en el sidebar).
 *
 * Trigger: el botón hamburguesa vive en este mismo componente, posicionado
 * para encajar en la zona izquierda del Topbar mobile. Se abre con click,
 * se cierra con X, click en backdrop, ESC, o al cambiar de ruta.
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
  section?: string;
  items: NavItem[];
}

// Mismo agrupamiento que el sidebar desktop (sin "Lugares": el drawer mobile
// no recibe showLugares, así que se omite igual que antes).
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
    items: [
      { href: "/configuracion#tech-rider", label: "Tech rider", icon: SlidersHorizontal },
    ],
  },
  {
    section: "AYUDA",
    items: [{ href: "/soporte", label: "Soporte", icon: LifeBuoy }],
  },
  {
    section: "SISTEMA",
    items: [{ href: "/configuracion", label: "Configuración", icon: Settings }],
  },
];

interface MobileMenuProps {
  userEmail?: string;
  isAdmin?: boolean;
  artistName?: string | null;
  avatarUrl?: string | null;
}

export function MobileMenu({
  userEmail,
  isAdmin = false,
  artistName,
  avatarUrl,
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
      {/* Backdrop */}
      <div
        className={cn(
          "md:hidden fixed inset-0 z-[60] bg-ink/70 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 z-[70] w-[280px] max-w-[85vw] bg-ink text-white border-r-2 border-orange flex flex-col overflow-hidden transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        {/* Header naranja con close */}
        <div
          className="shrink-0 px-[18px] py-[14px] bg-orange text-ink border-b-2 border-border flex items-center justify-between"
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
            className="h-9 w-9 flex items-center justify-center border-2 border-border hover:bg-ink hover:text-orange transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Nav agrupada (mismo agrupamiento que sidebar desktop) */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.section ?? `m-top-${gi}`}>
              {group.section && (
                <div className="px-[22px] pt-[13px] pb-[4px] font-mono text-[9px] font-bold tracking-[0.14em] text-[#555]">
                  {group.section}
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
                    {/* Fila: el label (Link) navega; el caret (button) togglea. */}
                    <div
                      className={cn(
                        "grid grid-cols-[1fr_auto] items-center border-l-[3px] transition-colors",
                        isActive
                          ? "bg-orange text-ink border-l-border"
                          : "text-[#aaa] border-transparent"
                      )}
                    >
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center gap-3 px-[22px] py-[11px] min-w-0 font-mono text-[12px] font-bold uppercase tracking-[0.08em]",
                          !isActive && "hover:bg-[#1a1a1a] hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0",
                            isActive ? "text-fg" : "text-orange"
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
                            "self-stretch flex items-center px-[18px] transition-colors",
                            isActive ? "text-ink" : "text-[#777] hover:text-white"
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
                                "flex items-center gap-2 pl-[46px] pr-[22px] py-[9px] font-mono text-[11px] font-bold uppercase tracking-[0.06em] border-l-[3px] border-transparent transition-colors",
                                childActive
                                  ? "text-orange"
                                  : "text-[#8a8a8a] hover:text-white"
                              )}
                            >
                              <span aria-hidden="true" className="text-[#3a3a3a]">
                                └
                              </span>
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
              <div className="my-[10px] mx-[22px] border-t-2 border-dashed border-[#2a2a2a]" />
              <Link
                href="/admin"
                className={cn(
                  "mx-[22px] px-3 py-[7px] border border-orange font-mono text-[10px] font-bold uppercase tracking-[0.1em] flex items-center justify-center gap-2",
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

        {/* Artist card al pie — clickeable → /perfil (mirror desktop) */}
        <Link
          href="/perfil"
          className="shrink-0 m-[14px] p-[12px] bg-[#161616] border border-[#2a2a2a] relative hover:bg-[#202020] transition-colors"
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
                className="w-[38px] h-[38px] object-cover shrink-0"
              />
            ) : (
              <div
                className="w-[38px] h-[38px] bg-orange text-ink flex items-center justify-center shrink-0"
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
                className="font-mono text-[8px] text-[#666] mt-[2px] truncate"
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
          className="block shrink-0 mx-[14px] mb-[14px] px-[14px] py-[10px] border-t border-[#2a2a2a] group transition-opacity hover:opacity-100 opacity-80"
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
      </aside>
    </>
  );
}
