"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { ComingSoonBadge } from "@/components/coming-soon";
import { Logo } from "@/components/brand/logo";
import { NavBanners } from "@/components/layout/nav-banners";
import { NAV_GROUPS, filterNav, type NavItem } from "@/lib/nav-config";
import { activeTopKey, buildDesktopNav, type TopKey } from "@/lib/nav-desktop";
import { useIsomorphicLayoutEffect } from "@/lib/use-isomorphic-layout-effect";

/**
 * DROP. — DesktopTopNav (Hybrid OS · navbar de vidrio flotante).
 *
 * Reemplaza el Sidebar en escritorio por una pastilla glass flotante:
 * grid `1fr auto 1fr`, sticky arriba, `hidden md:grid` (mobile = tarea aparte).
 * - Col izquierda: chip glass `DROP. · LIVE` + banners beta/trial (misma
 *   lógica de color/label que `Topbar`).
 * - Col centro: `.navpill` con los buckets de `buildDesktopNav`. Un indicador
 *   naranja absoluto se desliza bajo el bucket activo según la RUTA
 *   (`activeTopKey`, no por click). Los buckets con submenú despliegan un
 *   `.pdropdown` en hover / click / teclado.
 * - Col derecha: chip glass con avatar que abre el menú de perfil (nombre,
 *   email, stats, links, y SALIR con el logout verbatim de `Topbar`).
 *
 * Porta 1:1 el look del mockup aprobado (scratchpad/drop-nav-src.html):
 * `.topnav / .navpill / .pill-ind / .pdropdown / .pgroup / .pitem`.
 */

interface DesktopTopNavProps {
  userEmail?: string;
  isAdmin?: boolean;
  artistName?: string | null;
  avatarUrl?: string | null;
  /** Total de contactos del CRM. undefined → "—". */
  contactCount?: number;
  /** Gigs (shows) agendados en el mes actual. undefined → "—". */
  gigsThisMonth?: number;
  /** "Lugares" solo se muestra si hay venues verificados. */
  showLugares?: boolean;
  /** Sprint 23.5 — banner con días restantes de beta. null si no es beta. */
  betaDaysRemaining?: number | null;
  /** Sprint S19 — banner con días restantes del trial. null si no aplica. */
  trialDaysRemaining?: number | null;
}

// Foco visible naranja — mismo string que Sidebar/Topbar/MobileMenu.
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]";

// Spring del mockup (--spring): la pastilla "rebota" al reposicionarse.
const SPRING = "cubic-bezier(.34,1.56,.64,1)";

export function DesktopTopNav({
  userEmail,
  isAdmin = false,
  artistName,
  avatarUrl,
  contactCount,
  gigsThisMonth,
  showLugares = true,
  betaDaysRemaining,
  trialDaysRemaining,
}: DesktopTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Buckets del navbar — estables salvo que cambie showLugares.
  const buckets = useMemo(
    () => buildDesktopNav(filterNav(NAV_GROUPS, { showLugares })),
    [showLugares]
  );
  // El bucket activo lo decide la RUTA (no el click).
  const activeKey = activeTopKey(buckets, pathname);

  // ── Estado de UI ────────────────────────────────────────────────────────
  const [openKey, setOpenKey] = useState<TopKey | null>(null); // dropdown abierto
  const [profileOpen, setProfileOpen] = useState(false); // popover de perfil
  const [reduceMotion, setReduceMotion] = useState(false);

  // Indicador naranja: left/width medidos del bucket activo.
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  // La transición se habilita recién tras el primer posicionamiento, para que
  // la pastilla no "crezca" desde 0 en el primer paint.
  const [ready, setReady] = useState(false);

  // ── Refs ────────────────────────────────────────────────────────────────
  const navRef = useRef<HTMLElement | null>(null);
  const groupRefs = useRef(new Map<TopKey, HTMLDivElement>());
  const profileRef = useRef<HTMLDivElement | null>(null);
  // Timer para cerrar en hover con pequeño delay: puentea el gap de 14px entre
  // el botón y el panel (si no, mouseleave cerraría antes de llegar al submenú).
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearHoverTimer = useCallback(() => {
    if (hoverCloseTimer.current) {
      clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }, []);
  const openBucket = useCallback(
    (key: TopKey) => {
      clearHoverTimer();
      setOpenKey(key);
    },
    [clearHoverTimer]
  );
  const scheduleClose = useCallback(
    (key: TopKey) => {
      clearHoverTimer();
      hoverCloseTimer.current = setTimeout(() => {
        setOpenKey((k) => (k === key ? null : k));
      }, 120);
    },
    [clearHoverTimer]
  );
  useEffect(() => clearHoverTimer, [clearHoverTimer]);
  const setGroupRef = useCallback(
    (key: TopKey) => (el: HTMLDivElement | null) => {
      const map = groupRefs.current;
      if (el) map.set(key, el);
      else map.delete(key);
    },
    []
  );

  // ── prefers-reduced-motion ──────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── Medición del indicador (sin salto en el primer paint) ───────────────
  const measure = useCallback(() => {
    const el = groupRefs.current.get(activeKey);
    if (!el) return;
    // offsetLeft/Width relativos al <nav> (padding-box), igual que el mockup.
    setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeKey]);

  // Medir antes de pintar en cada cambio de ruta / buckets.
  useIsomorphicLayoutEffect(() => {
    measure();
  }, [measure, buckets]);

  // Recalcular cuando el <nav> cambia de tamaño (resize, fuentes, banners).
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measure]);

  // Habilitar la transición un frame después del primer posicionamiento.
  useEffect(() => {
    if (indicator && !ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [indicator, ready]);

  // ── Cierre de dropdown / perfil ─────────────────────────────────────────
  // Al navegar (cambia la ruta) se cierra todo.
  useEffect(() => {
    setOpenKey(null);
    setProfileOpen(false);
  }, [pathname]);

  // Esc y click afuera cierran lo que esté abierto.
  useEffect(() => {
    if (openKey === null && !profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenKey(null);
        setProfileOpen(false);
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (navRef.current?.contains(t)) return;
      if (profileRef.current?.contains(t)) return;
      setOpenKey(null);
      setProfileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openKey, profileOpen]);

  // Blur fuera del grupo (tab-out) cierra su dropdown.
  const handleGroupBlur = useCallback(
    (key: TopKey) => (e: React.FocusEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
        setOpenKey((k) => (k === key ? null : k));
      }
    },
    []
  );

  // ── Logout (verbatim de Topbar) ─────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
    // Al cerrar sesión va al LANDING público (/), no a /login — consistente con
    // el resto de la app.
    router.push("/");
    router.refresh();
  }

  // ── Identidad del artista (verbatim de Sidebar) ─────────────────────────
  const displayName =
    artistName && artistName.trim().length > 0
      ? artistName.trim().toUpperCase()
      : "TU NOMBRE";
  const avatarChar = displayName.charAt(0);

  // Activo por ruta para links-hoja (misma regla que Sidebar): las anclas (#)
  // nunca marcan activo.
  const isLeafActive = useCallback(
    (href: string) => {
      if (href.includes("#")) return false;
      return (
        pathname === href ||
        (href !== "/dashboard" && pathname.startsWith(href))
      );
    },
    [pathname]
  );

  // Avatar reutilizable (chip derecho 28px, popover 38px).
  const renderAvatar = (size: number) =>
    avatarUrl ? (
      <Image
        src={avatarUrl}
        alt={displayName}
        width={size}
        height={size}
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size }}
      />
    ) : (
      <div
        aria-hidden="true"
        className="rounded-full bg-orange text-ink flex items-center justify-center shrink-0 font-display leading-none"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {avatarChar}
      </div>
    );

  // ── Render de un ítem del dropdown (link + hijos anidados) ──────────────
  const renderDropItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isLeafActive(item.href);
    const hasChildren = !!(item.children && item.children.length > 0);
    return (
      <div key={item.href} role="none">
        <Link
          href={item.href}
          role="menuitem"
          aria-current={active ? "page" : undefined}
          onClick={() => setOpenKey(null)}
          className={cn(
            "group flex items-center gap-2.5 px-[11px] py-2 rounded-[10px] text-[13px] transition-colors hover:bg-white/[0.06]",
            active ? "text-orange" : "text-white/90",
            FOCUS_RING
          )}
        >
          <Icon
            aria-hidden="true"
            className={cn(
              "w-4 h-4 shrink-0 transition-colors",
              active ? "text-orange" : "text-white/40 group-hover:text-orange"
            )}
            strokeWidth={1.7}
          />
          <span className="min-w-0 truncate">{item.label}</span>
          {item.comingSoon && (
            <span className="ml-1 shrink-0">
              <ComingSoonBadge text="PRÓXIMAMENTE" />
            </span>
          )}
          {hasChildren && (
            <span aria-hidden="true" className="ml-auto text-white/40 text-xs">
              ›
            </span>
          )}
        </Link>
        {hasChildren && (
          <div className="ml-6 mt-0.5 mb-1.5 pl-[11px] border-l border-white/15">
            {item.children!.map((child) => {
              const childActive = isLeafActive(child.href);
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  role="menuitem"
                  aria-current={childActive ? "page" : undefined}
                  onClick={() => setOpenKey(null)}
                  className={cn(
                    "flex items-center gap-1 py-1.5 px-2 rounded-lg font-mono text-[11px] tracking-[0.05em] transition-colors hover:bg-white/[0.05]",
                    childActive
                      ? "text-orange"
                      : "text-white/55 hover:text-orange",
                    FOCUS_RING
                  )}
                >
                  <span aria-hidden="true" className="text-white/35">
                    ›
                  </span>
                  {child.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Estilos compartidos entre el pitem-Link (Dashboard) y el pitem-button.
  const pitemClass = (active: boolean) =>
    cn(
      "relative z-[1] flex items-center gap-2 px-[15px] py-2.5 rounded-full",
      "font-mono text-[11px] tracking-[0.11em] uppercase whitespace-nowrap",
      "bg-transparent border-0 cursor-pointer",
      !reduceMotion && "transition-colors duration-300",
      active ? "text-ink" : "text-fg-muted hover:text-fg",
      FOCUS_RING
    );

  // Panel del dropdown (fondo oscuro fijo → colores claros por legibilidad).
  const dropdownPanelStyle: React.CSSProperties = {
    background: "rgba(20,20,20,.94)",
    backdropFilter: "blur(22px) saturate(160%)",
    WebkitBackdropFilter: "blur(22px) saturate(160%)",
    boxShadow: "0 26px 60px -14px #000, inset 0 1px 0 rgba(255,255,255,.14)",
  };

  return (
    <header className="hidden md:grid grid-cols-[1fr_auto_1fr] items-center gap-3 sticky top-0 z-50 px-5 py-4">
      {/* ── Col izquierda: chip DROP. · LIVE + banners ── */}
      <div className="flex items-center gap-3 justify-self-start min-w-0">
        <div className="hos-glass flex items-center gap-2.5 px-[15px] py-2 rounded-full shrink-0">
          <Logo size={19} tone="cream" />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-fg-muted flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse"
            />
            LIVE
          </span>
        </div>

        <NavBanners
          betaDaysRemaining={betaDaysRemaining}
          trialDaysRemaining={trialDaysRemaining}
        />
      </div>

      {/* ── Col centro: pastilla glass con indicador deslizante ── */}
      <div className="relative justify-self-center z-[2]">
        <nav
          ref={navRef}
          aria-label="Navegación"
          className="hos-glass relative flex items-center gap-0.5 p-1.5 rounded-full"
        >
          {/* Indicador naranja — se desliza bajo el bucket activo. */}
          <span
            aria-hidden="true"
            className="absolute top-1.5 z-0 rounded-full bg-orange pointer-events-none"
            style={{
              height: "calc(100% - 12px)",
              left: indicator?.left ?? 0,
              width: indicator?.width ?? 0,
              opacity: indicator ? 1 : 0,
              boxShadow:
                "0 8px 20px -5px rgba(232,90,12,.85), inset 0 1px 0 rgba(255,255,255,.35)",
              transition:
                ready && !reduceMotion
                  ? `left .5s ${SPRING}, width .5s ${SPRING}`
                  : "none",
            }}
          />

          {buckets.map((bucket) => {
            const Icon = bucket.icon;
            const active = bucket.key === activeKey;
            const isOpen = openKey === bucket.key;
            const hasDropdown = !bucket.direct;

            return (
              <div
                key={bucket.key}
                ref={setGroupRef(bucket.key)}
                className="relative z-[1]"
                onMouseEnter={
                  hasDropdown ? () => openBucket(bucket.key) : undefined
                }
                onMouseLeave={
                  hasDropdown ? () => scheduleClose(bucket.key) : undefined
                }
                onBlur={hasDropdown ? handleGroupBlur(bucket.key) : undefined}
              >
                {bucket.direct ? (
                  // Bucket directo (Dashboard) = link, sin submenú.
                  <Link
                    href={bucket.direct.href}
                    aria-current={
                      isLeafActive(bucket.direct.href) ? "page" : undefined
                    }
                    className={pitemClass(active)}
                  >
                    <Icon
                      aria-hidden="true"
                      className="w-[15px] h-[15px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span>{bucket.label}</span>
                  </Link>
                ) : (
                  // Bucket con submenú = button que abre/cierra el dropdown.
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    onClick={() => {
                      clearHoverTimer();
                      setOpenKey((k) => (k === bucket.key ? null : bucket.key));
                    }}
                    className={pitemClass(active)}
                  >
                    <Icon
                      aria-hidden="true"
                      className="w-[15px] h-[15px] shrink-0"
                      strokeWidth={1.7}
                    />
                    <span>{bucket.label}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "w-2.5 h-2.5 -ml-0.5 opacity-70",
                        !reduceMotion && "transition-transform duration-300",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                )}

                {/* Dropdown — en el DOM siempre (para la transición), oculto
                    con visibility cuando cerrado (sale del tab/AX tree). */}
                {hasDropdown && (
                  <div
                    role="menu"
                    aria-label={bucket.label}
                    className={cn(
                      "absolute left-1/2 top-[calc(100%+14px)] min-w-[230px] p-2 rounded-[16px] border border-white/15 z-[60]",
                      !reduceMotion &&
                        "transition-[opacity,transform] duration-200",
                      isOpen ? "opacity-100 visible" : "opacity-0 invisible"
                    )}
                    style={{
                      ...dropdownPanelStyle,
                      transform: `translateX(-50%) translateY(${
                        isOpen ? "0" : "-8px"
                      })`,
                    }}
                  >
                    {bucket.key === "mas" && bucket.sections
                      ? bucket.sections.map((sec) => (
                          <div key={sec.section ?? "sec"} role="none">
                            {sec.section && (
                              <div className="font-mono text-[9.5px] tracking-[0.2em] uppercase text-white/40 px-[11px] pt-2 pb-1">
                                {sec.section}
                              </div>
                            )}
                            {sec.items.map(renderDropItem)}
                          </div>
                        ))
                      : bucket.items.map(renderDropItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* ── Col derecha: chip perfil + popover ── */}
      <div
        className="relative justify-self-end z-[2]"
        ref={profileRef}
        onBlur={(e) => {
          // Tab-out del grupo (foco sale del chip/popover) cierra el popover —
          // mismo patrón que los dropdowns del nav (handleGroupBlur).
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            setProfileOpen(false);
          }
        }}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          aria-label="Menú de perfil"
          onClick={() => setProfileOpen((o) => !o)}
          className={cn(
            "hos-glass flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-full",
            "transition-colors",
            FOCUS_RING
          )}
        >
          {renderAvatar(28)}
          <span className="hidden lg:inline font-display text-[15px] leading-none max-w-[140px] truncate">
            {displayName}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "w-3.5 h-3.5 text-fg-muted",
              !reduceMotion && "transition-transform duration-300",
              profileOpen && "rotate-180"
            )}
          />
        </button>

        {profileOpen && (
          <div
            role="menu"
            aria-label="Perfil"
            className="absolute right-0 top-[calc(100%+14px)] min-w-[260px] p-2 rounded-[16px] border border-white/15 z-[60] text-white"
            style={dropdownPanelStyle}
          >
            {/* Cabecera: avatar + nombre + email (link al perfil) */}
            <Link
              href="/perfil"
              role="menuitem"
              onClick={() => setProfileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 p-2 rounded-[10px] transition-colors hover:bg-white/[0.06]",
                FOCUS_RING
              )}
            >
              {renderAvatar(38)}
              <div className="min-w-0 flex-1">
                <div className="font-display text-lg leading-none truncate">
                  {displayName}
                </div>
                <div className="font-mono text-[9px] text-white/40 mt-1 truncate tracking-wider">
                  {userEmail || "DJ · LATAM"}
                </div>
              </div>
            </Link>

            {/* Stats (portadas de la card del Sidebar) */}
            <div className="grid grid-cols-2 gap-2 mt-2 px-2 border-t border-white/10 pt-2.5">
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

            {/* Links */}
            <div className="mt-2 border-t border-white/10 pt-2">
              <Link
                href="/perfil"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className={cn(
                  "block px-[11px] py-2 rounded-[10px] font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-white/85 transition-colors hover:bg-white/[0.06] hover:text-orange",
                  FOCUS_RING
                )}
              >
                Ver perfil
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  role="menuitem"
                  aria-current={
                    pathname.startsWith("/admin") ? "page" : undefined
                  }
                  onClick={() => setProfileOpen(false)}
                  className={cn(
                    "block px-[11px] py-2 rounded-[10px] font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-orange transition-colors hover:bg-white/[0.06]",
                    FOCUS_RING
                  )}
                >
                  + ADMIN · BACKSTAGE
                </Link>
              )}
              <a
                href="mailto:hola@dropgigs.com"
                className={cn(
                  "block px-[11px] py-2 rounded-[10px] transition-colors hover:bg-white/[0.06] group",
                  FOCUS_RING
                )}
              >
                <div className="font-mono text-[8px] text-white/40 tracking-[0.08em] group-hover:text-orange transition-colors">
                  <span className="text-orange">→</span>&nbsp; CONTACTO
                </div>
                <div className="font-mono text-[11px] mt-0.5 text-white group-hover:text-orange transition-colors truncate">
                  hola@dropgigs.com
                </div>
              </a>
            </div>

            {/* SALIR (logout verbatim de Topbar) */}
            <div className="mt-2 border-t border-white/10 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  "hos-clay-btn w-full h-9 px-3 rounded-full text-white/85 hover:text-[rgb(var(--drop-orange))] font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-1.5 active:translate-y-px",
                  FOCUS_RING
                )}
              >
                <LogOut className="w-3.5 h-3.5" />
                SALIR
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
