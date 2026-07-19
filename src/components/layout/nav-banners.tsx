"use client";

/**
 * DROP. — NavBanners (Hybrid OS · banners beta/trial compartidos).
 *
 * Fuente de verdad única de la lógica color/label de los banners beta/trial
 * que antes estaba duplicada en `Topbar` y `DesktopTopNav` (mismos umbrales,
 * strings, colores y el link accionable a `/suscripcion` del trial).
 *
 * Se usa en:
 * - `DesktopTopNav` (columna izquierda, junto al chip DROP. · LIVE).
 * - La tira móvil del shell flag-ON en `(app)/layout.tsx`.
 *
 * Devuelve `null` cuando no hay ningún banner activo (ni beta ni trial), para
 * que el contenedor pueda colapsar (`empty:hidden`).
 */
interface NavBannersProps {
  /** Sprint 23.5 — banner con días restantes de beta. null si no es beta. */
  betaDaysRemaining?: number | null;
  /** Sprint S19 — banner con días restantes del trial. null si no aplica
   *  (no es trial user, es beta legacy, o ya está pagando). */
  trialDaysRemaining?: number | null;
}

// Foco visible naranja, consistente con Sidebar/Topbar/DesktopTopNav/MobileDock
// (mismo string).
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]";

export function NavBanners({
  betaDaysRemaining,
  trialDaysRemaining,
}: NavBannersProps) {
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

  // Sin banner activo → null, así el contenedor puede colapsar (empty:hidden).
  if (betaLabel === null && trialLabel === null) return null;

  return (
    <>
      {/* Sprint 23.5 — Banner beta (mobile sm+ / desktop) */}
      {betaLabel && betaBannerColor && (
        <span
          className={`hidden sm:inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border rounded-full ${betaBannerColor}`}
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
          className={`inline-flex items-center font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border rounded-full hover:opacity-80 transition-opacity ${trialBannerColor} ${FOCUS_RING}`}
          title="Click para suscribirte ahora"
        >
          {trialLabel}
        </a>
      )}
    </>
  );
}
