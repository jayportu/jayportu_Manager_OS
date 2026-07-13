"use client";

import { LogOut, Menu } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { MOBILE_MENU_OPEN_EVENT } from "./mobile-menu";

interface TopbarProps {
  userEmail?: string;
  /** Sprint 23.5 — banner con días restantes de beta. null si no es beta. */
  betaDaysRemaining?: number | null;
  /** Sprint S19 — banner con días restantes del trial. null si no aplica
   *  (no es trial user, es beta legacy, o ya está pagando). */
  trialDaysRemaining?: number | null;
}

/**
 * DROP. — Topbar (Hybrid OS · glass).
 * Panel frosted (blur + fondo semi-transparente, UNA sola capa de blur en el
 * `<header>`) sobre el fondo oscuro de la app — mismo lenguaje que
 * `src/components/layout/sidebar.tsx` y `_kit/shell.tsx`. Mobile: logo + banners.
 * Desktop: banners + email + cerrar sesión. Sin buscador (búsqueda real = T1 aparte).
 */
export function Topbar({
  userEmail,
  betaDaysRemaining,
  trialDaysRemaining,
}: TopbarProps) {
  // Banner color según días restantes (mismo esquema para beta y trial):
  // - >2 días → orange (normal)
  // - 0-2 días → warning (yellow)
  // - <0 días → danger (expirado)
  const betaBannerColor =
    betaDaysRemaining === null || betaDaysRemaining === undefined
      ? null
      : betaDaysRemaining < 0
      ? "bg-danger text-white dark:text-ink border-danger"
      : betaDaysRemaining <= 2
      ? "bg-warning text-fg dark:text-ink border-border"
      : "bg-orange text-ink border-border";

  const betaLabel =
    betaDaysRemaining === null || betaDaysRemaining === undefined
      ? null
      : betaDaysRemaining < 0
      ? "BETA TERMINÓ"
      : betaDaysRemaining === 0
      ? "BETA · ÚLTIMO DÍA"
      : `BETA · ${betaDaysRemaining} ${betaDaysRemaining === 1 ? "DÍA" : "DÍAS"}`;

  // Sprint S19 — Banner del trial (excluyente con el de beta: nunca
  // co-existen, porque legacy beta users no entran al flow de trial).
  const trialBannerColor =
    trialDaysRemaining === null || trialDaysRemaining === undefined
      ? null
      : trialDaysRemaining <= 2
      ? "bg-warning text-fg dark:text-ink border-border"
      : "bg-orange text-ink border-border";

  const trialLabel =
    trialDaysRemaining === null || trialDaysRemaining === undefined
      ? null
      : trialDaysRemaining === 0
      ? "TRIAL · ÚLTIMO DÍA"
      : `TRIAL · ${trialDaysRemaining} ${trialDaysRemaining === 1 ? "DÍA" : "DÍAS"}`;
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    // Al cerrar sesión va al LANDING público (/), no a /login — consistente con
    // el resto de la app (route /logout + botones booker/modales). PR #119 lo
    // arregló allá pero este topbar de DJ usa signOut del cliente y se quedó afuera.
    router.push("/");
    router.refresh();
  }

  return (
    <header
      className="border-b border-white/10 flex items-center gap-3 shrink-0 relative w-full overflow-hidden"
      style={{
        background: "rgba(18,18,18,0.5)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
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
        className="md:hidden h-10 w-10 -ml-2 mr-1 flex items-center justify-center text-fg hover:text-orange transition-colors shrink-0"
      >
        <Menu className="w-6 h-6" strokeWidth={2.25} />
      </button>

      {/* Logo mobile */}
      <div className="md:hidden flex items-center shrink-0">
        <span
          className="select-none inline-block"
          style={{
            fontFamily: "var(--font-satoshi), system-ui, sans-serif",
            fontWeight: 900,
            fontSize: "24px",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: "rgb(var(--drop-fg))",
          }}
        >
          DROP<span style={{ color: "rgb(var(--drop-orange))", marginLeft: "-0.06em" }}>.</span>
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

      {/* Sprint S19 — Banner trial (excluyente con beta). Visible también en
          mobile: es el aviso más accionable (lleva a /suscripcion). */}
      {trialLabel && trialBannerColor && (
        <a
          href="/suscripcion"
          className={`inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border-2 hover:opacity-80 transition-opacity ${trialBannerColor}`}
          title="Click para suscribirte ahora"
        >
          {trialLabel}
        </a>
      )}

      {/* Spacer — empuja email + logout a la derecha (antes lo hacía el
          buscador en desktop; búsqueda real = ticket T1 aparte). */}
      <div className="flex-1" />

      {/* User actions */}
      <div className="flex items-center gap-3">
        <span className="hidden lg:inline font-mono text-[10px] font-bold text-fg-muted tracking-[0.08em] uppercase">
          {userEmail}
        </span>
        <button
          onClick={handleLogout}
          className="h-9 px-3 border-2 border-border bg-ink text-orange hover:bg-orange hover:text-ink font-mono text-[10px] font-bold uppercase tracking-[0.1em] transition-colors flex items-center gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SALIR</span>
        </button>
      </div>
    </header>
  );
}
