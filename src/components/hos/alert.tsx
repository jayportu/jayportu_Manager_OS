/* — Alert — 4 tonos semánticos mapeados a los tokens del sistema — */
const ALERT_TONE = {
  info: "var(--drop-info)",
  success: "var(--drop-success)",
  warn: "var(--drop-warning)",
  danger: "var(--drop-danger)",
} as const;

export function Alert({
  tone = "info", title, children,
}: { tone?: keyof typeof ALERT_TONE; title?: string; children: React.ReactNode }) {
  const v = ALERT_TONE[tone];
  const c = `rgb(${v})`;
  return (
    <div
      className="flex gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] leading-snug"
      style={{ borderColor: `rgb(${v} / .333)`, background: `rgb(${v} / .071)`, color: "rgba(255,255,255,.82)" }}
    >
      <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
      <div>
        {title && <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: c }}>{title} </span>}
        {children}
      </div>
    </div>
  );
}
