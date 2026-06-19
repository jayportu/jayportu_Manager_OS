/**
 * Capa 2 — Tarjetas visuales de gear para el press kit.
 *
 * Render server-side de los items del rider (parseados del texto libre) como
 * tarjetas con ícono line-art + cantidad. Estética editorial DROP (ink/cream/
 * orange, borde brutalista). A diferencia de Ready to Play —que muestra fotos
 * stock de equipos— acá usamos íconos vectoriales consistentes con la marca y
 * sin problemas de derechos de imagen.
 */
import type { TechRiderItem, RiderCategory } from "@/types/database";
import { RIDER_CATEGORY_LABELS } from "@/types/database";

type IconKind =
  | "player"
  | "turntable"
  | "mixer"
  | "monitor"
  | "mic"
  | "power"
  | "generic";

function iconKindFor(item: TechRiderItem): IconKind {
  const n = item.name.toLowerCase();
  if (/turntable|technics|sl-?1200|sl 1200|plx|plato|vinilo|vinyl|tornamesa/.test(n))
    return "turntable";
  if (/mic|micr[oó]fono/.test(n)) return "mic";
  switch (item.category) {
    case "reproduccion":
      return "player";
    case "mixer":
      return "mixer";
    case "monitores":
      return "monitor";
    case "power_cables":
      return "power";
    default:
      return "generic";
  }
}

function GearIcon({ kind }: { kind: IconKind }) {
  const common = {
    width: 40,
    height: 40,
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "player": // CDJ / XDJ — jog wheel
      return (
        <svg {...common} aria-hidden="true">
          <rect x="7" y="9" width="34" height="30" rx="2" />
          <circle cx="24" cy="26" r="8" />
          <circle cx="24" cy="26" r="2.5" />
          <line x1="12" y1="14" x2="20" y2="14" />
          <rect x="30" y="13" width="6" height="3" rx="1" />
        </svg>
      );
    case "turntable": // platter + tonearm
      return (
        <svg {...common} aria-hidden="true">
          <rect x="7" y="9" width="34" height="30" rx="2" />
          <circle cx="21" cy="26" r="9" />
          <circle cx="21" cy="26" r="2" />
          <line x1="34" y1="13" x2="27" y2="22" />
          <circle cx="35" cy="12" r="2" />
        </svg>
      );
    case "mixer": // faders + knobs
      return (
        <svg {...common} aria-hidden="true">
          <rect x="9" y="8" width="30" height="32" rx="2" />
          <circle cx="16" cy="15" r="1.6" />
          <circle cx="24" cy="15" r="1.6" />
          <circle cx="32" cy="15" r="1.6" />
          <line x1="16" y1="23" x2="16" y2="35" />
          <line x1="24" y1="23" x2="24" y2="35" />
          <line x1="32" y1="23" x2="32" y2="35" />
          <rect x="14.5" y="27" width="3" height="3" fill="currentColor" stroke="none" />
          <rect x="22.5" y="30" width="3" height="3" fill="currentColor" stroke="none" />
          <rect x="30.5" y="25" width="3" height="3" fill="currentColor" stroke="none" />
        </svg>
      );
    case "monitor": // wedge speaker
      return (
        <svg {...common} aria-hidden="true">
          <path d="M10 34 L38 34 L34 16 L18 16 Z" />
          <circle cx="26" cy="26" r="5" />
          <circle cx="20" cy="20" r="1.5" />
        </svg>
      );
    case "mic":
      return (
        <svg {...common} aria-hidden="true">
          <rect x="19" y="7" width="10" height="18" rx="5" />
          <path d="M14 22 a10 10 0 0 0 20 0" />
          <line x1="24" y1="32" x2="24" y2="40" />
          <line x1="18" y1="40" x2="30" y2="40" />
        </svg>
      );
    case "power": // plug
      return (
        <svg {...common} aria-hidden="true">
          <path d="M16 8 v10 a8 8 0 0 0 16 0 V8" />
          <line x1="20" y1="6" x2="20" y2="12" />
          <line x1="28" y1="6" x2="28" y2="12" />
          <line x1="24" y1="26" x2="24" y2="40" />
        </svg>
      );
    default: // generic box
      return (
        <svg {...common} aria-hidden="true">
          <rect x="9" y="12" width="30" height="24" rx="2" />
          <line x1="9" y1="20" x2="39" y2="20" />
          <circle cx="15" cy="16" r="1.2" fill="currentColor" />
        </svg>
      );
  }
}

const CATEGORY_ORDER: RiderCategory[] = [
  "reproduccion",
  "mixer",
  "monitores",
  "power_cables",
  "otros",
  "hospitality",
];

export function GearCards({ items }: { items: TechRiderItem[] }) {
  // No mostramos hospitality como tarjeta de gear (va en su propia caja).
  const gear = items
    .filter((i) => i.category !== "hospitality")
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
        a.sort_order - b.sort_order
    );
  if (gear.length === 0) return null;

  return (
    <div className="my-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {gear.map((item) => (
          <div
            key={item.id}
            className="relative flex flex-col items-center text-center gap-2 p-4 border-2 border-ink bg-white"
          >
            {item.quantity > 1 && (
              <span className="absolute top-2 right-2 font-mono text-[11px] font-bold text-cream bg-orange px-1.5 py-0.5 leading-none">
                {item.quantity}×
              </span>
            )}
            <div className="text-ink">
              <GearIcon kind={iconKindFor(item)} />
            </div>
            <div className="text-sm font-semibold leading-tight">{item.name}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">
              {RIDER_CATEGORY_LABELS[item.category]}
            </div>
            {item.note && (
              <div className="text-[10px] text-fg-subtle italic leading-tight">
                {item.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
