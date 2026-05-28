"use client";

import { Search, LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { MOBILE_MENU_OPEN_EVENT } from "./mobile-menu";

interface TopbarProps {
  userEmail?: string;
  /** Sprint 23.5 — banner con días restantes de beta. null si no es beta. */
  betaDaysRemaining?: number | null;
}

/**
 * DROP. — Topbar (Type Beat).
 * Bg cream con borde inferior 2px ink. Mobile: logo + ticker.
 * Desktop: search + email + cerrar sesión en estilo brutalist.
 */
export function Topbar({ userEmail, betaDaysRemaining }: TopbarProps) {
  // Banner color según días restantes:
  // - >2 días → orange (normal)
  // - 0-2 días → warning (yellow)
  // - <0 días → danger (expirado)
  const betaBannerColor =
    betaDaysRemaining === null || betaDaysRemaining === undefined
      ? null
      : betaDaysRemaining < 0
      ? "bg-danger text-white border-danger"
      : betaDaysRemaining <= 2
      ? "bg-warning text-ink border-ink"
      : "bg-orange text-ink border-ink";

  const betaLabel =
    betaDaysRemaining === null || betaDaysRemaining === undefined
      ? null
      : betaDaysRemaining < 0
      ? "BETA TERMINÓ"
      : betaDaysRemaining === 0
      ? "BETA · ÚLTIMO DÍA"
      : `BETA · ${betaDaysRemaining} ${betaDaysRemaining === 1 ? "DÍA" : "DÍAS"}`;
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  }

  return (
    <header
      className="border-b-2 border-ink bg-cream flex items-center gap-3 shrink-0 relative w-full overflow-hidden"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "calc(env(safe-area-inset-left) + 1.25rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 1.25rem)",
        height: "calc(4rem + env(safe-area-inset-top))",
      }}
    >
      {/* Hamburger (mobile only) — abre el MobileMenu vía custom event */}
      <button
        type="button"
        onClick={() =>
          window.dispatchEvent(new CustomEvent(MOBILE_MENU_OPEN_EVENT))
        }
        aria-label="Abrir menú"
        className="md:hidden h-10 w-10 -ml-2 mr-1 flex items-center justify-center text-ink hover:text-orange transition-colors shrink-0"
      >
        <Menu className="w-6 h-6" strokeWidth={2.25} />
      </button>

      {/* Logo mobile */}
      <div className="md:hidden flex items-center shrink-0">
        <span
          className="select-none inline-block"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "26px",
            lineHeight: 0.85,
            color: "#0A0A0A",
            paddingLeft: "2px",  /* compensar side-bearing izquierdo de la D en Anton condensed */
          }}
        >
          DROP<span style={{ color: "#FF5C00" }}>.</span>
        </span>
        <span className="ml-3 font-mono text-[9px] font-bold tracking-[0.15em] text-fg-muted hidden sm:inline">
          — THE DJ OS
        </span>
      </div>

      {/* Sprint 23.5 — Banner beta (mobile + desktop) */}
      {betaLabel && betaBannerColor && (
        <span
          className={`hidden sm:inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border-2 ${betaBannerColor}`}
          title="Estás en la beta cerrada"
        >
          {betaLabel}
        </span>
      )}

      {/* Search (desktop) */}
      <div className="hidden md:flex flex-1 max-w-md relative">
        <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="BUSCAR CONTACTO, VENUE, FECHA…"
          className="w-full h-10 pl-10 pr-4 bg-white border-2 border-ink font-mono text-[11px] font-bold uppercase tracking-[0.05em] placeholder:text-fg-subtle focus:outline-none focus:border-orange transition-colors"
        />
      </div>

      <div className="flex-1 md:hidden" />

      {/* User actions */}
      <div className="flex items-center gap-3">
        <span className="hidden lg:inline font-mono text-[10px] font-bold text-fg-muted tracking-[0.08em] uppercase">
          {userEmail}
        </span>
        <button
          onClick={handleLogout}
          className="h-9 px-3 border-2 border-ink bg-ink text-orange hover:bg-orange hover:text-ink font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SALIR</span>
        </button>
      </div>
    </header>
  );
}
