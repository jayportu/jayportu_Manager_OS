"use client";

import { cn } from "@/lib/utils";

const ORANGE = "#E85A0C";

/* — Toggle (switch controlado, role="switch", foco naranja, target ≥44px) — */
export function Toggle({
  checked, onChange, label, sub, disabled,
}: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; disabled?: boolean }) {
  return (
    <label className={cn("flex items-center justify-between gap-4 py-1", disabled && "opacity-50")}>
      <span className="min-w-0">
        <span className="block text-sm text-white/85">{label}</span>
        {sub && <span className="block text-[12px] leading-snug text-white/45">{sub}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]"
        style={{ background: checked ? ORANGE : "rgba(255,255,255,.14)" }}
      >
        <span className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform" style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }} />
      </button>
    </label>
  );
}
