import { cn } from "@/lib/utils";

export function GlassPanel({
  children, className, sweep = false, padded = true,
}: { children: React.ReactNode; className?: string; sweep?: boolean; padded?: boolean }) {
  return (
    <section className={cn("hos-glass group relative overflow-hidden rounded-2xl", padded && "p-5", className)}>
      <span aria-hidden className="pointer-events-none absolute inset-x-5 top-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent)" }} />
      {sweep && (
        <span aria-hidden className="hos-sweep pointer-events-none absolute -left-1/3 top-0 z-10 h-full w-1/2 -translate-x-4 opacity-0 transition-all duration-500 group-hover:translate-x-[240%] group-hover:opacity-100" />
      )}
      <div className="relative">{children}</div>
    </section>
  );
}
