import Link from "next/link";
import { cn } from "@/lib/utils";

const ORANGE = "#E85A0C";
const INK = "#0B0B0B";

/* — KpiTile canónico (Clay) — reemplaza las 7 versiones — */
export function KpiTile({
  label, value, sub, delta, tone = "flat", accent = false, href,
}: {
  label: string; value: string | number; sub?: string;
  delta?: string; tone?: "up" | "down" | "flat"; accent?: boolean; href?: string;
}) {
  const deltaColor =
    tone === "up" ? "rgb(var(--drop-success))"
      : tone === "down" ? "rgb(var(--drop-danger))"
      : "rgba(255,255,255,.5)";

  const content = (
    <div
      className="hos-clay rounded-2xl px-4 py-4"
      style={accent ? { background: ORANGE, color: INK, boxShadow: "6px 6px 15px #060606, -4px -4px 11px #2a2a2a" } : undefined}
    >
      <div className={cn("font-mono text-[9px] font-bold uppercase tracking-[0.14em]", accent ? "text-[#0B0B0B]/70" : "text-white/45")}>
        — {label}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="font-display text-3xl leading-none md:text-4xl">{value}</span>
        {sub && <span className={cn("font-mono text-[10px] uppercase tracking-wider", accent ? "text-[#0B0B0B]/60" : "text-white/40")}>{sub}</span>}
      </div>
      {delta && (
        <div className="mt-2 font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: accent ? "rgba(11,11,11,.7)" : deltaColor }}>
          {delta}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
