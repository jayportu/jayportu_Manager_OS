import { cn } from "@/lib/utils";

export function GlassPanel({
  children, className, sweep = false, padded = true,
}: { children: React.ReactNode; className?: string; sweep?: boolean; padded?: boolean }) {
  return (
    <section className={cn("hos-glass group relative overflow-hidden rounded-2xl", sweep && "hos-sweep-card", padded && "p-5", className)}>
      <span aria-hidden className="pointer-events-none absolute inset-x-5 top-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)" }} />
      <div className="relative">{children}</div>
    </section>
  );
}
