import Link from "next/link";
import { Wallet } from "lucide-react";
import { getCobros } from "@/lib/queries/calendar-events";
import { daysOverdue, type CobrosRange } from "@/lib/calendar/cobros";
import { formatClp, shortDate, dateTime } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  type CalendarEventRow,
} from "@/lib/calendar/types";
import { Card } from "@/components/ui/card";
import { FinanceEditDialog } from "./finance-edit";
import { MarkPaidButton } from "./mark-paid-button";

const RANGES: { key: CobrosRange; label: string }[] = [
  { key: "all", label: "Todo" },
  { key: "year", label: "Este año" },
  { key: "month", label: "Este mes" },
];

export async function CobrosView({ range }: { range: CobrosRange }) {
  const { porCobrar, cobrado, totalPorCobrar, totalCobrado, venuesDeben, proyectado } =
    await getCobros(range);
  const nothing = porCobrar.length === 0 && cobrado.length === 0;

  return (
    <div>
      {/* KPIs + selector de rango */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-border mb-5">
        <div className="bg-bg-panel p-4 border-t-2 border-t-warning border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
            — POR COBRAR
          </div>
          <div className="font-display text-3xl leading-none mt-2 text-warning">
            {totalPorCobrar > 0 ? formatClp(totalPorCobrar) : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2 text-warning">
            {venuesDeben} {venuesDeben === 1 ? "gig debe" : "gigs deben"}
          </div>
        </div>
        <div className="bg-bg-panel p-4 md:border-r-2 border-border">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
            — COBRADO
          </div>
          <div className="font-display text-3xl leading-none mt-2 text-accent">
            {formatClp(totalCobrado)}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {cobrado.length} {cobrado.length === 1 ? "gig" : "gigs"}
          </div>
        </div>
        <div className="bg-bg-panel p-4 border-t-2 border-border md:border-t-0 md:border-r-2">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
            — PROYECTADO
          </div>
          <div className="font-display text-3xl leading-none mt-2 text-fg">
            {proyectado.total > 0 ? formatClp(proyectado.total) : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {proyectado.count}{" "}
            {proyectado.count === 1 ? "gig por venir" : "gigs por venir"}
          </div>
        </div>
        <div className="bg-bg-panel p-4 border-t-2 border-border md:border-t-0">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
            — RANGO
          </div>
          <div className="mt-2 flex gap-1 flex-wrap">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/calendario?view=cobros&range=${r.key}`}
                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-1 border-2 border-border transition-colors ${
                  range === r.key
                    ? "bg-orange text-ink"
                    : "bg-bg-panel text-fg-muted hover:text-fg"
                }`}
                aria-current={range === r.key ? "page" : undefined}
              >
                {r.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {proyectado.byMonth.length > 0 && (
        <div className="border-2 border-border bg-bg-panel p-4 mb-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-2">
            — PROYECTADO POR MES
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {proyectado.byMonth.map((m) => (
              <div
                key={m.key}
                className="shrink-0 border-2 border-border px-3 py-2"
              >
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange">
                  {m.monthLabel}
                </div>
                <div className="font-display text-xl leading-none mt-1 text-fg">
                  {formatClp(m.total)}
                </div>
                <div className="font-mono text-[9px] text-fg-muted mt-1">
                  {m.count} {m.count === 1 ? "gig" : "gigs"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nothing && (
        <Card className="p-10 text-center">
          <Wallet className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin cobros en este rango</h3>
          <p className="text-sm text-fg-muted max-w-md mx-auto">
            Cárgale un monto a tus gigs con el botón $ (en la vista Lista) y
            aparecerán acá para hacerles seguimiento de pago.
          </p>
        </Card>
      )}

      {porCobrar.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-warning mb-3">
            — POR COBRAR ({porCobrar.length})
          </h2>
          <ul className="space-y-2">
            {porCobrar.map((ev) => (
              <CobroRow key={ev.id} ev={ev} />
            ))}
          </ul>
        </section>
      )}

      {cobrado.length > 0 && (
        <section className="mb-8">
          <details open={porCobrar.length === 0}>
            <summary className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-success mb-3 cursor-pointer">
              — COBRADO ({cobrado.length})
            </summary>
            <ul className="space-y-2 mt-3">
              {cobrado.map((ev) => (
                <CobradoRow key={ev.id} ev={ev} />
              ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}

function CobroRow({ ev }: { ev: CalendarEventRow }) {
  const overdue = daysOverdue(ev.start_at);
  const status = ev.payment_status;
  const tint =
    status === "partial" ? "border-info bg-info/5" : "border-warning bg-warning/5";
  return (
    <li className={`border-2 ${tint} px-4 py-3`}>
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-border bg-cream">
              {formatClp(ev.amount_clp)}
              {status !== "none" ? ` · ${PAYMENT_STATUS_LABELS[status]}` : ""}
            </span>
            {overdue !== null && (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
                hace {overdue} {overdue === 1 ? "día" : "días"}
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-fg-muted mt-1">
            {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
            {ev.location ? ` · ${ev.location}` : ""}
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <MarkPaidButton eventId={ev.id} />
          <FinanceEditDialog
            eventId={ev.id}
            title={ev.title}
            current={{
              amount_clp: ev.amount_clp,
              payment_status: ev.payment_status,
              document_type: ev.document_type,
            }}
          />
        </div>
      </div>
    </li>
  );
}

function CobradoRow({ ev }: { ev: CalendarEventRow }) {
  return (
    <li className="border-2 border-success bg-success/5 px-4 py-3">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-border bg-success text-white dark:text-ink">
              {formatClp(ev.amount_clp)}
            </span>
          </div>
          <div className="font-mono text-[11px] text-fg-muted mt-1">
            {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
            {ev.location ? ` · ${ev.location}` : ""}
            {ev.paid_at ? ` · pagado ${shortDate(ev.paid_at)}` : ""}
          </div>
        </div>
        <FinanceEditDialog
          eventId={ev.id}
          title={ev.title}
          current={{
            amount_clp: ev.amount_clp,
            payment_status: ev.payment_status,
            document_type: ev.document_type,
          }}
        />
      </div>
    </li>
  );
}
