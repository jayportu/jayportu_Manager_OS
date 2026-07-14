import { MonoLabel } from "./mono-label";
import { ORANGE } from "./tokens";

/* — Hero de sección canónico (arregla el hero inconsistente) — */
export function SectionHero({
  kicker, title, sub, actions,
}: { kicker: string; title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <MonoLabel>{kicker}</MonoLabel>
        <h1 className="mt-1.5 font-display text-4xl leading-[0.9] tracking-tight md:text-5xl">
          {title}<span style={{ color: ORANGE }}>.</span>
        </h1>
        {sub && <p className="mt-2 max-w-xl text-sm text-white/55">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
