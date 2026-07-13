const INK = "#0B0B0B";

/* — Badge canónico (estados) — */
const BADGE_TONE: Record<"up" | "warn" | "down" | "info" | "neutral", string> = {
  up: "rgb(var(--drop-success))",
  warn: "rgb(var(--drop-warning))",
  down: "rgb(var(--drop-danger))",
  info: "rgb(var(--drop-info))",
  neutral: "rgba(255,255,255,.5)",
};

export function Badge({
  children, tone = "neutral", solid = false,
}: { children: React.ReactNode; tone?: "up" | "warn" | "down" | "info" | "neutral"; solid?: boolean }) {
  const c = BADGE_TONE[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em]"
      style={solid ? { background: c, color: INK } : { border: `1px solid ${c}`, color: c, background: "rgba(255,255,255,.03)" }}
    >
      {children}
    </span>
  );
}
