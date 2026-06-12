import { Ban } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import { listSuppressions } from "@/lib/queries/suppressions";
import { relativeTime } from "@/lib/format";
import { addSuppressionAction, removeSuppressionAction } from "./actions";

export const dynamic = "force-dynamic";

const REASON_META: Record<string, { label: string; color: string }> = {
  unsubscribe: { label: "Se dio de baja", color: "#c0392b" },
  bounced: { label: "Rebotó", color: "#FF5C00" },
  complained: { label: "Queja (spam)", color: "#c0392b" },
  manual: { label: "Manual", color: "#7A7670" },
};

const SOURCE_LABEL: Record<string, string> = {
  "list-unsubscribe": "botón del correo",
  "reply-bajar": "respondió «bajar»",
  webhook: "automático",
  admin: "agregado a mano",
  seed: "histórico",
};

export default async function BajasPage() {
  await assertAdmin();
  const rows = await listSuppressions();
  const byReason: Record<string, number> = {};
  for (const r of rows) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
        <Ban className="w-6 h-6 text-accent" /> Lista de bajas
      </h1>
      <p className="text-sm text-fg-muted mt-3 max-w-2xl">
        Todos los correos a los que <strong>no</strong> hay que volver a escribir. Se
        llena sola: rebotes, quejas de spam, quien aprieta &laquo;darse de baja&raquo; en
        el correo y quien responde &laquo;bajar&raquo;. Los envíos de campaña consultan
        esta lista <strong>siempre</strong> y excluyen a quien esté acá.
      </p>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 mb-6">
        <div className="border border-border rounded-lg p-4 bg-card">
          <div className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.1em]">
            Total
          </div>
          <div className="text-3xl font-bold leading-none mt-2">{rows.length}</div>
        </div>
        {(["unsubscribe", "bounced", "complained", "manual"] as const).map((r) => (
          <div key={r} className="border border-border rounded-lg p-4 bg-card">
            <div className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.1em]">
              {REASON_META[r].label}
            </div>
            <div className="text-3xl font-bold leading-none mt-2">
              {byReason[r] ?? 0}
            </div>
          </div>
        ))}
      </div>

      {/* Alta manual */}
      <form
        action={addSuppressionAction}
        className="border border-border rounded-lg p-4 bg-card mb-6 flex flex-wrap items-end gap-3"
      >
        <div className="flex-1 min-w-[220px]">
          <label className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.1em] block mb-1">
            Agregar correo a mano
          </label>
          <input
            type="email"
            name="email"
            required
            placeholder="correo@dominio.com"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="font-mono text-[10px] text-fg-muted uppercase tracking-[0.1em] block mb-1">
            Nota (opcional)
          </label>
          <input
            type="text"
            name="note"
            placeholder="ej: pidió baja por WhatsApp"
            className="w-full border border-border rounded-md px-3 py-2 text-sm bg-bg"
          />
        </div>
        <button
          type="submit"
          className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] bg-ink text-cream hover:bg-orange hover:text-ink px-4 py-2.5 rounded-md transition-colors"
        >
          Agregar
        </button>
      </form>

      {/* Lista */}
      {rows.length === 0 ? (
        <p className="text-sm text-fg-muted border border-border rounded-lg p-6 bg-card text-center">
          Todavía no hay bajas registradas.
        </p>
      ) : (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          {rows.map((r) => {
            const m = REASON_META[r.reason] ?? { label: r.reason, color: "#7A7670" };
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 px-4 py-3 border-t border-border/60 first:border-t-0 text-sm"
              >
                <span
                  className="font-mono text-[9px] uppercase tracking-[0.08em] rounded px-2 py-1 whitespace-nowrap"
                  style={{ color: m.color, background: `${m.color}14` }}
                >
                  {m.label}
                </span>
                <div className="min-w-0">
                  <div className="truncate">{r.email}</div>
                  <div className="text-[11px] text-fg-muted">
                    {SOURCE_LABEL[r.source ?? ""] ?? r.source ?? "—"}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <span className="ml-auto font-mono text-[10px] text-fg-muted whitespace-nowrap">
                  {relativeTime(r.created_at)}
                </span>
                <form action={removeSuppressionAction}>
                  <input type="hidden" name="email" value={r.email} />
                  <button
                    type="submit"
                    title="Quitar de la lista (re-suscribir)"
                    className="font-mono text-[10px] uppercase tracking-[0.08em] text-fg-muted hover:text-accent border border-border rounded px-2 py-1 transition-colors"
                  >
                    Quitar
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
