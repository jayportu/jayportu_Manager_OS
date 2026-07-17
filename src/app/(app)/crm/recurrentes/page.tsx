import Link from "next/link";
import { ArrowLeft, RotateCw } from "lucide-react";
import { listRecurringFollowUps } from "@/lib/queries/follow-ups";
import { Button } from "@/components/ui/button";
import { dateTime, relativeTime } from "@/lib/format";
import { santiagoToday, santiagoDay } from "@/lib/tz";
import {
  GlassPanel,
  Badge,
  SectionHero,
  EmptyState,
  ClayChip,
} from "@/components/hos";
import { RecurrentesActions } from "./recurrentes-actions";

export default async function RecurrentesPage() {
  const items = await listRecurringFollowUps();

  // Agrupar por serie (recurrence_series_id) y dejar el follow-up pendiente
  // más próximo de cada una.
  const bySeries = new Map<string, typeof items[number]>();
  for (const f of items) {
    const key = f.recurrence_series_id ?? f.id;
    if (!bySeries.has(key)) bySeries.set(key, f);
  }
  const series = Array.from(bySeries.values()).sort(
    (a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
  );

  const now = new Date();

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <Link
        href="/crm"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver a CRM
      </Link>

      <SectionHero
        kicker="CRM · FOLLOW-UPS RECURRENTES"
        title="PIPELINE DE RUTINA"
        sub={
          series.length === 0
            ? "Aún no tienes follow-ups recurrentes. Crea uno desde la ficha de cualquier contacto activando el toggle 'Hacer recurrente'."
            : `${series.length} ${series.length === 1 ? "serie activa" : "series activas"}. Cada vez que cierres uno, DROP crea automáticamente el siguiente.`
        }
      />

      {series.length === 0 ? (
        <EmptyState
          icon={RotateCw}
          title="Sin recurrencias"
          sub="Útil para “mensajear al booker cada 30 días”, “pedir feedback post-gig 7 días después”, “actualizar press kit cada trimestre”, etc."
          action={
            <Button asChild variant="clayPrimary" size="sm">
              <Link href="/crm">Ir al CRM</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {series.map((f) => {
            const due = new Date(f.due_at);
            const overdue = due < now;
            // "Hoy" se compara por día calendario EN CHILE (no en UTC del
            // server, que de noche en Chile ya está en el día siguiente).
            const dueToday = !overdue && santiagoDay(f.due_at) === santiagoToday();
            const tint = overdue
              ? "border border-danger/40"
              : dueToday
              ? "border border-orange/40"
              : "";

            const unitLabel =
              f.recurrence_unit === "days"
                ? "días"
                : f.recurrence_unit === "weeks"
                ? "semanas"
                : "meses";

            return (
              <GlassPanel key={f.id} className={tint}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ClayChip>
                        cada {f.recurrence_value} {unitLabel}
                      </ClayChip>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange">
                        ciclo {f.recurrence_index}
                        {f.recurrence_max ? ` / ${f.recurrence_max}` : ""}
                      </span>
                      {overdue && <Badge tone="down">atrasado</Badge>}
                      {dueToday && <Badge tone="warn">hoy</Badge>}
                    </div>
                    <Link
                      href={f.contact_id ? `/crm/${f.contact_id}` : "/crm"}
                      className="block font-display text-2xl leading-tight mt-2 hover:text-orange transition-colors"
                    >
                      {f.note || "(sin nota)"}
                    </Link>
                    <div className="font-mono text-[11px] text-fg-muted mt-1.5">
                      {f.contact_name && (
                        <>
                          {f.contact_name} ·{" "}
                        </>
                      )}
                      vence {dateTime(f.due_at)} ({relativeTime(f.due_at)})
                    </div>
                  </div>
                  <RecurrentesActions
                    followUpId={f.id}
                    seriesId={f.recurrence_series_id ?? f.id}
                    contactId={f.contact_id}
                  />
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
