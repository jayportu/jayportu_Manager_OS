"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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
  Sparkles,
  Settings,
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

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/crm", label: "CRM", icon: Users },
  { href: "/descubrir", label: "Descubrir", icon: Compass },
  { href: "/campanas", label: "Campañas", icon: Megaphone },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/press-kit", label: "Press kit", icon: FileImage },
  { href: "/plantillas", label: "Plantillas", icon: LayoutTemplate },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/growth", label: "Growth", icon: TrendingUp },
  { href: "/ia", label: "IA · Strategy", icon: Sparkles },
  { href: "/configuracion", label: "Configuración", icon: Settings },
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
          "md:hidden fixed inset-y-0 left-0 z-[70] w-[280px] max-w-[85vw] bg-ink text-cream border-r-2 border-orange flex flex-col overflow-hidden transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menú principal"
      >
        {/* Header naranja con close */}
        <div
          className="shrink-0 px-[18px] py-[14px] bg-orange text-ink border-b-2 border-ink flex items-center justify-between"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 14px)" }}
        >
          <div>
            <div className="font-mono text-[9px] font-bold tracking-[0.12em]">
              — THE DJ OS
            </div>
            <div
              className="mt-[4px]"
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "22px",
                lineHeight: 0.95,
              }}
            >
              DROP<span style={{ color: "#0A0A0A" }}>.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menú"
            className="h-9 w-9 flex items-center justify-center border-2 border-ink hover:bg-ink hover:text-orange transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2.25} />
          </button>
        </div>

        {/* Nav items (mismos que sidebar desktop) */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-[22px] py-[11px] font-mono text-[12px] font-bold uppercase tracking-[0.08em] border-l-[3px] border-transparent transition-colors",
                  isActive
                    ? "bg-orange text-ink border-l-ink"
                    : "text-[#aaa] hover:bg-[#1a1a1a] hover:text-cream"
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
              </Link>
            );
          })}

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
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
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
                className="text-cream truncate"
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
      </aside>
    </>
  );
}
