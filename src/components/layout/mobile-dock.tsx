"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Compass,
  CalendarDays,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_MENU_OPEN_EVENT } from "@/components/layout/mobile-menu";

/**
 * DROP. — MobileDock (Hybrid OS · dock inferior con notch).
 *
 * Reemplaza el hamburguesa mobile por un dock flotante de 5 slots, portado
 * 1:1 del mockup aprobado (`scratchpad/drop-nav-src.html`:
 * `.dock / .dock-notch / .dock-bubble / .dock-row / .dock-btn`).
 *
 * - Los primeros 4 slots (`Inicio/CRM/Descubrir/Agenda`) son `<Link>` — el
 *   activo se decide por la RUTA (misma regla que Sidebar/DesktopTopNav).
 * - `Menú` es un `<button>` que dispara el mismo evento que ya escucha
 *   `MobileMenu` (`MOBILE_MENU_OPEN_EVENT`) — reutiliza el drawer existente,
 *   no se toca `mobile-menu.tsx`.
 * - El ícono del slot activo "flota" en una burbuja naranja y un notch
 *   (circulo recortado en el borde superior) la sigue. Se mide el centro del
 *   slot activo (offsetLeft/offsetWidth relativos al `dock-row`, igual que
 *   `layoutDock` del mockup) y se mueve la burbuja/notch con
 *   `transform: translateX(...)`. `Menú` nunca es el slot flotante activo.
 */

interface DockSlot {
  key: string;
  label: string;
  icon: LucideIcon;
  /** undefined ⇒ slot "Menú": abre el drawer en vez de navegar. */
  href?: string;
}

const SLOTS: DockSlot[] = [
  { key: "inicio", label: "Inicio", icon: Home, href: "/dashboard" },
  { key: "crm", label: "CRM", icon: Users, href: "/crm" },
  { key: "descubrir", label: "Descubrir", icon: Compass, href: "/descubrir" },
  { key: "agenda", label: "Agenda", icon: CalendarDays, href: "/calendario" },
  { key: "menu", label: "Menú", icon: LayoutGrid },
];

// Foco visible naranja — mismo string que Sidebar/Topbar/MobileMenu/DesktopTopNav.
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]";

// Spring del mockup (--spring): la burbuja/notch "rebotan" al reposicionarse.
const SPRING = "cubic-bezier(.34,1.56,.64,1)";

// Mismo criterio de "activo" que Sidebar/MobileMenu/DesktopTopNav.
function isSlotActive(href: string, pathname: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export function MobileDock() {
  const pathname = usePathname();

  // Índice activo derivado de la ruta. Solo los 4 slots con `href` compiten;
  // "Menú" nunca puede ser el activo. Sin match ⇒ default a Inicio (0).
  const activeIndex = useMemo(() => {
    const idx = SLOTS.findIndex((s) => s.href && isSlotActive(s.href, pathname));
    return idx === -1 ? 0 : idx;
  }, [pathname]);

  const ActiveIcon = SLOTS[activeIndex].icon;

  const [reduceMotion, setReduceMotion] = useState(false);
  // Centro (en px, relativo al dock-row) del slot activo. null = aún no medido.
  const [center, setCenter] = useState<number | null>(null);
  // La transición se habilita recién tras el primer posicionamiento, para que
  // la burbuja/notch no "salten" desde 0 en el primer paint.
  const [ready, setReady] = useState(false);

  const rowRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef(new Map<number, HTMLElement>());
  const setSlotRef = useCallback(
    (idx: number) => (el: HTMLElement | null) => {
      const map = slotRefs.current;
      if (el) map.set(idx, el);
      else map.delete(idx);
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

  // ── Medición del slot activo (layoutDock del mockup) ────────────────────
  const measure = useCallback(() => {
    const el = slotRefs.current.get(activeIndex);
    if (!el) return;
    // offsetLeft/Width son relativos al dock-row (position:absolute, inset-0
    // dentro del dock) — mismo cálculo que `btn.offsetLeft` en el mockup.
    setCenter(el.offsetLeft + el.offsetWidth / 2);
  }, [activeIndex]);

  // Medir antes de pintar en cada cambio de ruta.
  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Recalcular cuando el dock-row cambia de tamaño (resize / rotación).
  useEffect(() => {
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(row);
    return () => ro.disconnect();
  }, [measure]);

  // Habilitar la transición un frame después del primer posicionamiento.
  useEffect(() => {
    if (center !== null && !ready) {
      const id = requestAnimationFrame(() => setReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [center, ready]);

  const transitionStyle = ready && !reduceMotion ? `transform .5s ${SPRING}` : "none";
  // Burbuja: 48px (w-12) ⇒ centrar restando la mitad. Notch: 60px ⇒ ídem.
  const bubbleX = (center ?? 0) - 24;
  const notchX = (center ?? 0) - 30;
  const measured = center !== null;

  return (
    <nav
      aria-label="Navegación inferior"
      className="fixed bottom-0 inset-x-0 z-[55] md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative mx-4 mb-4 h-16 border border-border-strong bg-bg-panel shadow-[0_-6px_30px_rgba(0,0,0,.5)]">
        {/* Notch — círculo "recortado" en el borde superior que sigue al slot
            activo. Decorativo: pointer-events-none para no tapar el tap real. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-px left-0 z-0 h-[30px] w-[60px]"
          style={{ opacity: measured ? 1 : 0, transform: `translateX(${notchX}px)`, transition: transitionStyle }}
        >
          <span className="absolute left-1/2 top-[-30px] h-14 w-14 -translate-x-1/2 rounded-full bg-bg shadow-[0_0_0_1px_rgb(var(--drop-border-strong))_inset]" />
        </span>

        {/* Burbuja naranja — el ícono del slot activo "flota" acá arriba. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-5 left-0 z-[3] grid h-12 w-12 place-items-center rounded-full bg-orange text-ink shadow-[0_10px_22px_-6px_rgba(232,90,12,.85)]"
          style={{ opacity: measured ? 1 : 0, transform: `translateX(${bubbleX}px)`, transition: transitionStyle }}
        >
          <ActiveIcon className="h-[22px] w-[22px]" strokeWidth={2} />
        </span>

        {/* Fila de slots — los 4 primeros navegan, "Menú" abre el drawer. */}
        <div ref={rowRef} className="absolute inset-0 z-[1] flex">
          {SLOTS.map((slot, idx) => {
            const Icon = slot.icon;
            const active = idx === activeIndex;
            const iconClass = cn(
              "h-[21px] w-[21px] transition-opacity duration-300 motion-reduce:transition-none",
              active && "opacity-0"
            );
            const labelClass = cn(
              "font-mono text-[8px] uppercase tracking-[0.06em]",
              active ? "font-bold text-orange" : "text-fg-subtle"
            );
            const commonClass = cn(
              "relative flex flex-1 flex-col items-center justify-center gap-[3px] border-0 bg-transparent text-fg-subtle",
              FOCUS_RING
            );

            if (slot.href) {
              return (
                <Link
                  key={slot.key}
                  ref={setSlotRef(idx)}
                  href={slot.href}
                  aria-current={active ? "page" : undefined}
                  className={commonClass}
                >
                  <Icon className={iconClass} aria-hidden="true" strokeWidth={2} />
                  <span className={labelClass}>{slot.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={slot.key}
                ref={setSlotRef(idx)}
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent(MOBILE_MENU_OPEN_EVENT))}
                className={commonClass}
              >
                <Icon className={iconClass} aria-hidden="true" strokeWidth={2} />
                <span className={labelClass}>{slot.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
