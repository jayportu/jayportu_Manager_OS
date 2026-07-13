import { cn } from "@/lib/utils";

/* — Primitivas de tabla — superficie SÓLIDA, sin blur por fila —
 * Sustituyen al DataTable genérico: el markup por dominio se mantiene,
 * solo se estandarizan contenedor, cabecera y celdas.                */
export function TableShell({ children, className, bare = false }: { children: React.ReactNode; className?: string; bare?: boolean }) {
  // bare=true: sin marco propio, para vivir DENTRO de un GlassPanel (patrón CRM/Dashboard).
  return (
    <div className={bare ? "" : "overflow-hidden rounded-2xl border border-white/10"} style={bare ? undefined : { background: "rgba(255,255,255,.02)" }}>
      <div className="overflow-x-auto">
        <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
      </div>
    </div>
  );
}
type Align = "left" | "right" | "center";
const alignCls = (a?: Align) => (a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left");
export function Th({ children, align, className }: { children?: React.ReactNode; align?: Align; className?: string }) {
  return (
    <th className={cn("whitespace-nowrap border-b border-white/10 bg-white/[0.03] px-3 py-2.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-white/40", alignCls(align), className)}>
      {children}
    </th>
  );
}
export function Td({ children, align, className }: { children?: React.ReactNode; align?: Align; className?: string }) {
  return <td className={cn("border-b border-white/[0.06] px-3 py-2.5 align-middle text-white/75", alignCls(align), className)}>{children}</td>;
}

/* — Tarjeta-registro para el colapso mobile de las tablas — */
export function MobileRecordCard({
  title, meta, children,
}: { title: React.ReactNode; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 p-3" style={{ background: "rgba(255,255,255,.03)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 font-display text-base leading-none">{title}</div>
        {meta && <div className="shrink-0">{meta}</div>}
      </div>
      {children && <div className="mt-2.5 space-y-1.5 text-[12px] text-white/55">{children}</div>}
    </div>
  );
}
export function RecordRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-[9px] uppercase tracking-wider text-white/35">{k}</span>
      <span className="min-w-0 truncate text-right text-white/70">{children}</span>
    </div>
  );
}
