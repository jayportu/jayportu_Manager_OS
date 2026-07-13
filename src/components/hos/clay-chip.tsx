const ORANGE = "#E85A0C";
const INK = "#0B0B0B";

/* — Chip de filtro (clay, toggle) — */
export function ClayChip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className="hos-clay cursor-default rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider transition-transform"
      style={active
        ? { background: ORANGE, color: INK, boxShadow: "inset 2px 2px 5px rgba(0,0,0,.3)" }
        : { color: "rgba(255,255,255,.7)" }}
    >
      {children}
    </span>
  );
}
