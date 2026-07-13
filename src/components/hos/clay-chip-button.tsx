"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ORANGE, INK } from "./tokens";

/* — Chip clay interactivo (filtros, toggles de vista) — */
export function ClayChipButton({
  children, active = false, onClick, icon: Icon, className,
}: { children: React.ReactNode; active?: boolean; onClick?: () => void; icon?: LucideIcon; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "hos-clay inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-transform active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E85A0C]",
        className
      )}
      style={active
        ? { background: ORANGE, color: INK, boxShadow: "inset 2px 2px 5px rgba(0,0,0,.3)" }
        : { color: "rgba(255,255,255,.7)" }}
    >
      {Icon && <Icon width={13} height={13} strokeWidth={2.5} aria-hidden />}
      {children}
    </button>
  );
}
