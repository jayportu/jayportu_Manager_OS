import type { LucideIcon } from "lucide-react";

/* — EmptyState — invitación a actuar (reemplaza los ~10 ad-hoc) — */
export function EmptyState({
  icon: Icon, title, sub, action,
}: { icon?: LucideIcon; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 px-6 py-12 text-center"
      style={{ background: "rgba(255,255,255,.02)" }}
    >
      {Icon && (
        <span className="hos-clay mb-3 flex h-11 w-11 items-center justify-center rounded-full">
          <Icon width={18} height={18} className="text-white/55" aria-hidden />
        </span>
      )}
      <div className="font-display text-xl leading-none">{title}</div>
      {sub && <p className="mt-1.5 max-w-sm text-[13px] leading-snug text-white/50">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
