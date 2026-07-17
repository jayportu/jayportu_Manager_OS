import { Ban } from "lucide-react";
import { assertAdmin } from "@/lib/queries/admin";
import { listSuppressions } from "@/lib/queries/suppressions";
import { relativeTime } from "@/lib/format";
import {
  SectionHero,
  GlassPanel,
  KpiTile,
  Badge,
  EmptyState,
  TableShell,
  Th,
  Td,
  FIELD,
} from "@/components/hos";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addSuppressionAction, removeSuppressionAction } from "./actions";

export const dynamic = "force-dynamic";

type ReasonTone = "up" | "warn" | "down" | "info" | "neutral";

const REASON_META: Record<string, { label: string; tone: ReasonTone }> = {
  unsubscribe: { label: "Se dio de baja", tone: "neutral" },
  bounced: { label: "Rebotó", tone: "down" },
  complained: { label: "Queja (spam)", tone: "down" },
  manual: { label: "Manual", tone: "warn" },
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
      <SectionHero kicker="Admin · Correo" title="Lista de bajas" />
      <p className="text-sm text-white/55 -mt-2 mb-6 max-w-2xl">
        Todos los correos a los que <strong>no</strong> hay que volver a
        escribir. Se llena sola: rebotes, quejas de spam, quien aprieta
        &laquo;darse de baja&raquo; en el correo y quien responde
        &laquo;bajar&raquo;. Los envíos de campaña consultan esta lista{" "}
        <strong>siempre</strong> y excluyen a quien esté acá.
      </p>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <KpiTile label="Total" value={rows.length} />
        {(["unsubscribe", "bounced", "complained", "manual"] as const).map(
          (r) => (
            <KpiTile
              key={r}
              label={REASON_META[r].label}
              value={byReason[r] ?? 0}
            />
          )
        )}
      </div>

      {/* Alta manual */}
      <GlassPanel className="mb-6">
        <form
          action={addSuppressionAction}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex-1 min-w-[220px]">
            <Label htmlFor="sup-email">Agregar correo a mano</Label>
            <input
              id="sup-email"
              type="email"
              name="email"
              required
              placeholder="correo@dominio.com"
              className={`${FIELD} mt-1.5`}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label htmlFor="sup-note">Nota (opcional)</Label>
            <input
              id="sup-note"
              type="text"
              name="note"
              placeholder="ej: pidió baja por WhatsApp"
              className={`${FIELD} mt-1.5`}
            />
          </div>
          <Button type="submit" variant="clayPrimary">
            Agregar
          </Button>
        </form>
      </GlassPanel>

      {/* Lista */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="Sin bajas"
          sub="Todavía no hay bajas registradas."
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Motivo</Th>
              <Th>Correo</Th>
              <Th align="right">Cuándo</Th>
              <Th align="right">Acción</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const m = REASON_META[r.reason] ?? {
                label: r.reason,
                tone: "neutral" as const,
              };
              return (
                <tr key={r.id}>
                  <Td>
                    <Badge tone={m.tone}>{m.label}</Badge>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <div className="truncate">{r.email}</div>
                      <div className="text-[11px] text-white/45">
                        {SOURCE_LABEL[r.source ?? ""] ?? r.source ?? "—"}
                        {r.note ? ` · ${r.note}` : ""}
                      </div>
                    </div>
                  </Td>
                  <Td align="right">
                    <span className="font-mono text-[10px] text-white/40 whitespace-nowrap">
                      {relativeTime(r.created_at)}
                    </span>
                  </Td>
                  <Td align="right">
                    <form action={removeSuppressionAction}>
                      <input type="hidden" name="email" value={r.email} />
                      <Button
                        type="submit"
                        variant="clay"
                        size="sm"
                        title="Quitar de la lista (re-suscribir)"
                      >
                        Quitar
                      </Button>
                    </form>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
