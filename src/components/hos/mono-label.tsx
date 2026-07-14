import { cn } from "@/lib/utils";

/* — Etiqueta mono con em-dash (firma DROP) — */
export function MonoLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#E85A0C]", className)}>
      <span aria-hidden>— </span>{children}
    </span>
  );
}
