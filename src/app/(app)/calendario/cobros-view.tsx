import Link from "next/link";
import { Wallet } from "lucide-react";
import { getCobros } from "@/lib/queries/calendar-events";
import { daysOverdue, type CobrosRange } from "@/lib/calendar/cobros";
import { formatClp, shortDate, dateTime } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  type CalendarEventRow,
} from "@/lib/calendar/types";
import { KpiTile, Badge, ClayChip, EmptyState, MonoLabel } from "@/components/hos";
import { FinanceEditDialog } from "./finance-edit";
import { MarkPaidButton } from "./mark-paid-button";
import { payTone } from "./month-view";

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
      {/* Selector de rango — segmentado (SSR, Link + querystring) */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={`/calendario?view=cobros&range=${r.key}`}
            aria-current={range === r.key ? "page" : undefined}
          >
            <ClayChip active={range === r.key}>{r.label}</ClayChip>
          </Link>
        ))}
      </div>

      {/* KPIs de cobros — Clay canónico */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
        <KpiTile
          label="Por cobrar"
          value={totalPorCobrar > 0 ? formatClp(totalPorCobrar) : "—"}
          delta={`${venuesDeben} ${venuesDeben === 1 ? "gig debe" : "gigs deben"}`}
          accent
        />
        <KpiTile
          label="Cobrado"
          value={formatClp(totalCobrado)}
          delta={`${cobrado.length} ${cobrado.length === 1 ? "gig" : "gigs"}`}
          tone="up"
        />
        <KpiTile
          label="Proyectado"
          value={proyectado.total > 0 ? formatClp(proyectado.total) : "—"}
          delta={`${proyectado.count} ${proyectado.count === 1 ? "gig por venir" : "gigs por venir"}`}
          tone="flat"
        />
      </div>

      {proyectado.byMonth.length > 0 && (
        <div className="mb-5">
          <MonoLabel>Proyectado por mes</MonoLabel>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {proyectado.byMonth.map((m) => (
              <div
                key={m.key}
                className="shrink-0 rounded-lg border border-white/8 px-3 py-2"
                style={{ background: "var(--hos-clay-bg)" }}
              >
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange">
                  {m.monthLabel}
                </div>
                <div className="font-display text-xl leading-none mt-1">
                  {formatClp(m.total)}
                </div>
                <div className="font-mono text-[9px] text-white/40 mt-1">
                  {m.count} {m.count === 1 ? "gig" : "gigs"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {nothing && (
        <EmptyState
          icon={Wallet}
          title="Sin cobros en este rango"
          sub="Cárgale un monto a tus gigs con el botón $ (en la vista Lista) y aparecerán acá para hacerles seguimiento de pago."
        />
      )}

      {porCobrar.length > 0 && (
        <section className="mb-8">
          <MonoLabel>{`Por cobrar (${porCobrar.length})`}</MonoLabel>
          <ul className="mt-3 flex flex-col gap-2">
            {porCobrar.map((ev) => (
              <CobroRow key={ev.id} ev={ev} />
            ))}
          </ul>
        </section>
      )}

      {cobrado.length > 0 && (
        <section className="mb-8">
          <details open={porCobrar.length === 0}>
            <summary className="mb-3 cursor-pointer">
              <MonoLabel>{`Cobrado (${cobrado.length})`}</MonoLabel>
            </summary>
            <ul className="mt-3 flex flex-col gap-2">
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

/* Fila SÓLIDA (sin blur) — mismo lenguaje que EventRow en page.tsx */
const ROW_CLASS = "flex items-start gap-4 rounded-xl border border-white/8 px-4 py-3";
const ROW_STYLE = { background: "var(--hos-clay-bg)" } as const;

function CobroRow({ ev }: { ev: CalendarEventRow }) {
  const overdue = daysOverdue(ev.start_at);
  const status = ev.payment_status;
  const tone = payTone(status, true);
  return (
    <li className={ROW_CLASS} style={ROW_STYLE}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{ev.title}</span>
          <Badge tone={tone}>
            {formatClp(ev.amount_clp)}
            {status !== "none" ? ` · ${PAYMENT_STATUS_LABELS[status]}` : ""}
          </Badge>
          {overdue !== null && (
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-warning">
              hace {overdue} {overdue === 1 ? "día" : "días"}
            </span>
          )}
        </div>
        <div className="font-mono text-[11px] text-white/40 mt-1">
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
    </li>
  );
}

function CobradoRow({ ev }: { ev: CalendarEventRow }) {
  return (
    <li className={ROW_CLASS} style={ROW_STYLE}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{ev.title}</span>
          <Badge tone="up" solid>
            {formatClp(ev.amount_clp)}
          </Badge>
        </div>
        <div className="font-mono text-[11px] text-white/40 mt-1">
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
    </li>
  );
}
