import { cn } from "@/lib/utils";

/* — Campos de formulario (glass inset, foco naranja) — */
export const FIELD =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3 py-2 font-mono text-[12px] tracking-wide text-white placeholder:text-white/35 focus:outline-none focus:border-[#E85A0C] focus:ring-1 focus:ring-[#E85A0C]/50";
export const SELECT = cn(FIELD, "appearance-none pr-8");
