import Link from "next/link";
import { ArrowLeft, RotateCw } from "lucide-react";
import { listRecurringFollowUps } from "@/lib/queries/follow-ups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dateTime, relativeTime } from "@/lib/format";
import { santiagoToday, santiagoDay } from "@/lib/tz";
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
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a CRM
      </Link>

      <div className="border-2 border-border bg-bg-panel p-6 mb-5 relative">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — CRM · FOLLOW-UPS RECURRENTES
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          PIPELINE DE RUTINA<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          {series.length === 0
            ? "Aún no tienes follow-ups recurrentes. Crea uno desde la ficha de cualquier contacto activando el toggle 'Hacer recurrente'."
            : `${series.length} ${series.length === 1 ? "serie activa" : "series activas"}. Cada vez que cierres uno, DROP crea automáticamente el siguiente.`}
        </p>
      </div>

      {series.length === 0 ? (
        <Card className="p-10 text-center">
          <RotateCw className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin recurrencias</h3>
          <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
            Útil para &ldquo;mensajear al booker cada 30 días&rdquo;, &ldquo;pedir feedback
            post-gig 7 días después&rdquo;, &ldquo;actualizar press kit cada trimestre&rdquo;, etc.
          </p>
          <Button asChild variant="orange">
            <Link href="/crm">Ir al CRM</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {series.map((f) => {
            const due = new Date(f.due_at);
            const overdue = due < now;
            // "Hoy" se compara por día calendario EN CHILE (no en UTC del
            // server, que de noche en Chile ya está en el día siguiente).
            const dueToday = !overdue && santiagoDay(f.due_at) === santiagoToday();
            const tint = overdue
              ? "border-danger bg-danger/5"
              : dueToday
              ? "border-orange bg-orange/10"
              : "border-border bg-bg-panel";

            const unitLabel =
              f.recurrence_unit === "days"
                ? "días"
                : f.recurrence_unit === "weeks"
                ? "semanas"
                : "meses";

            return (
              <Card key={f.id} className={`p-4 border-2 ${tint}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-border bg-cream">
                        cada {f.recurrence_value} {unitLabel}
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange">
                        ciclo {f.recurrence_index}
                        {f.recurrence_max ? ` / ${f.recurrence_max}` : ""}
                      </span>
                      {overdue && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-danger text-white">
                          atrasado
                        </span>
                      )}
                      {dueToday && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange text-ink">
                          hoy
                        </span>
                      )}
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
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
