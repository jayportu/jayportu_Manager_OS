import {
  listMyEvents,
  CALENDAR_EVENT_TYPE_LABELS,
  getFinanceKpis,
} from "@/lib/queries/calendar-events";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Download, ListMusic, Globe, Lock } from "lucide-react";
import Link from "next/link";
import { SyncButton } from "./sync-button";
import { NewEventButton } from "./new-event-button";
import { AutoSync } from "./auto-sync";
import { FinanceEditDialog } from "./finance-edit";
import { EventEditDialog } from "./event-edit";
import { CalendarViewToggle } from "./view-toggle";
import { MonthView, resolveMonth, payTone, type PayTone } from "./month-view";
import { CobrosView } from "./cobros-view";
import type { CobrosRange } from "@/lib/calendar/cobros";
import { dateTime, shortDate, relativeTime, formatClp } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  type CalendarEventRow,
  type PaymentStatus,
} from "@/lib/calendar/types";
import { SectionHero, KpiTile, Alert, EmptyState, MonoLabel, Badge } from "@/components/hos";

interface PageProps {
  searchParams: Promise<{
    error?: string;
    synced?: string;
    view?: string;
    month?: string;
    range?: string;
  }>;
}

/** Trae las private_notes de los contactos asociados a los gigs (Sprint 19 E3). */
async function getContactPrivateNotes(
  contactIds: string[]
): Promise<Map<string, string>> {
  if (contactIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, private_notes")
    .in("id", contactIds);
  const map = new Map<string, string>();
  for (const c of (data || []) as { id: string; private_notes: string }[]) {
    if (c.private_notes && c.private_notes.trim().length > 0) {
      map.set(c.id, c.private_notes);
    }
  }
  return map;
}

export default async function CalendarioPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const view =
    sp.view === "mes" ? "mes" : sp.view === "cobros" ? "cobros" : "lista";
  const range: CobrosRange =
    sp.range === "year" ? "year" : sp.range === "month" ? "month" : "all";
  const monthSel = resolveMonth(sp.month);
  const conn = await getMyGmailConnection();

  // El calendario funciona sin Google: los eventos viven en la DB (alta manual
  // con "Nuevo evento" o al agendar un booking). Google es opcional y solo
  // sincroniza/trae eventos externos. Antes esta página hacía un return temprano
  // si no había conexión → escondía el calendario manual entero. Ahora el gate
  // es suave: mostramos todo y, si no hay Google, un banner para conectarlo.
  const now = new Date();
  const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const future120 = new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000);

  const [events, kpis] = await Promise.all([
    listMyEvents({
      fromISO: past30.toISOString(),
      toISO: future120.toISOString(),
    }),
    getFinanceKpis(),
  ]);

  // Sprint 19 — Cargar private_notes de contactos asociados a los gigs
  const contactIds = Array.from(
    new Set(events.map((e) => e.contact_id).filter((id): id is string => !!id))
  );
  const privateNotes =
    view === "lista" ? await getContactPrivateNotes(contactIds) : new Map<string, string>();

  const upcoming = events.filter((e) => new Date(e.start_at) >= now);
  const past = events.filter((e) => new Date(e.start_at) < now);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {conn && <AutoSync lastSyncAt={conn.last_sync_at} staleMinutes={5} />}

      <SectionHero
        kicker="Agenda · Calendario"
        title="Fechas"
        sub={
          `${upcoming.length} próximos · ${past.length} pasados` +
          (conn ? ` · conectado a ${conn.google_email}` : "")
        }
        actions={
          <>
            <CalendarViewToggle current={view} />
            {conn && <SyncButton />}
            <NewEventButton />
            <a
              href={`/api/export/finance?from=${now.getFullYear()}-01-01&to=${now.getFullYear() + 1}-01-01`}
              className="hos-clay-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/85 transition-transform active:translate-y-px hover:text-orange"
              download
              title="Exportar CSV de finanzas año actual"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
          </>
        }
      />

      {/* Línea fina bajo el hero: tip de conexión Google o info de última sync
          (SectionHero.sub es plain string — este detalle vive aparte). */}
      <p className="-mt-3 mb-5 font-mono text-[10px] uppercase tracking-wider text-white/35">
        {conn ? (
          <>Última sync: {relativeTime(conn.last_sync_at)} · auto al abrir</>
        ) : (
          <>
            Tip:{" "}
            <Link href="/configuracion" className="text-orange hover:underline">
              conecta Google
            </Link>{" "}
            para sincronizar tus shows automáticamente (opcional).
          </>
        )}
      </p>

      {/* Sprint 19 — KPIs financieros del mes */}
      {view === "lista" && kpis.totalGigs > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 mb-5">
          <KpiTile
            label="Cobrado este mes"
            value={formatClp(kpis.totalCobrado)}
            delta={`${kpis.gigsPagados} ${kpis.gigsPagados === 1 ? "gig" : "gigs"} CLP`}
            tone="up"
          />
          <KpiTile
            label="Total gigs"
            value={kpis.totalGigs.toString().padStart(2, "0")}
            delta={kpis.monthLabel.toUpperCase()}
            tone="flat"
          />
          <KpiTile
            label="Promedio / gig"
            value={kpis.avgPerGig > 0 ? formatClp(kpis.avgPerGig) : "—"}
            delta="Solo pagados"
            tone="flat"
          />
          <KpiTile
            label="Pendiente cobro"
            value={kpis.totalPendiente > 0 ? formatClp(kpis.totalPendiente) : "—"}
            delta={`${kpis.gigsPendientes} ${kpis.gigsPendientes === 1 ? "venue debe" : "venues deben"}`}
            accent
          />
        </div>
      )}

      {sp.error && (
        <div className="mb-5">
          <Alert tone="danger" title="Error">
            {sp.error}
          </Alert>
        </div>
      )}

      {sp.synced && (
        <div className="mb-4">
          <Alert tone="success">
            {sp.synced} eventos revisados desde Google Calendar.
          </Alert>
        </div>
      )}

      {view === "cobros" && <CobrosView range={range} />}

      {view === "mes" && <MonthView year={monthSel.year} month={monthSel.month} />}

      {view === "lista" && events.length === 0 && (
        <EmptyState
          icon={Calendar}
          title="Sin eventos aún"
          sub={`Crea tu primer evento${conn ? " o sincroniza tu Google Calendar para traer los existentes." : "."}`}
          action={
            <div className="flex justify-center gap-2 flex-wrap">
              {conn && <SyncButton />}
              <NewEventButton />
            </div>
          }
        />
      )}

      {/* Próximos */}
      {view === "lista" && upcoming.length > 0 && (
        <section className="mb-8">
          <MonoLabel className="mb-3 block">Próximos</MonoLabel>
          <ul className="flex flex-col gap-2">
            {upcoming.map((ev) => (
              <EventRow
                key={ev.id}
                ev={ev}
                privateNote={ev.contact_id ? privateNotes.get(ev.contact_id) : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      {/* Pasados (últimos 30 días) */}
      {view === "lista" && past.length > 0 && (
        <section className="mb-8">
          <details>
            <summary className="cursor-pointer mb-3">
              <MonoLabel>{`Últimos 30 días (${past.length})`}</MonoLabel>
            </summary>
            <ul className="flex flex-col gap-2 mt-3">
              {past
                .slice()
                .reverse()
                .map((ev) => (
                  <EventRow
                    key={ev.id}
                    ev={ev}
                    privateNote={ev.contact_id ? privateNotes.get(ev.contact_id) : undefined}
                  />
                ))}
            </ul>
          </details>
        </section>
      )}
    </div>
  );
}

/* Tinte del bloque-fecha según el tono de pago (sutil, sin blur) — mismos
   tokens que el Badge; solo cambia la opacidad para no competir con el resto
   de la fila. */
const DATE_TINT: Record<PayTone, string> = {
  up: "rgb(var(--drop-success) / .14)",
  warn: "rgb(var(--drop-warning) / .14)",
  info: "rgb(var(--drop-info) / .14)",
  neutral: "rgba(255,255,255,.04)",
};

function EventRow({
  ev,
  privateNote,
}: {
  ev: CalendarEventRow;
  privateNote?: string;
}) {
  // Fix bug 2026-06-01: getDate() retornaba el día en UTC del server (Vercel),
  // no en Santiago. Para eventos que cruzan medianoche (ej. 05-jun 21:00 CLT =
  // 06-jun 01:00 UTC), el card mostraba el día siguiente. Forzamos timezone
  // Santiago — igual que el mes abajo — para consistencia.
  const d = new Date(ev.start_at);
  const dayInTz = d.toLocaleString("es-CL", {
    day: "2-digit",
    timeZone: "America/Santiago",
  });
  const isShow = ev.type === "show";
  const hasAmount = ev.amount_clp !== null && ev.amount_clp > 0;
  const status: PaymentStatus = ev.payment_status;
  const tone = payTone(status, hasAmount);

  return (
    <li
      className="rounded-xl border border-white/8 px-4 py-3"
      style={{ background: "var(--hos-clay-bg)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="flex shrink-0 flex-col items-center justify-center rounded-lg px-2.5 py-2"
          style={{ background: DATE_TINT[tone], minWidth: 44 }}
        >
          <div className="font-display text-2xl leading-none text-orange">
            {dayInTz}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-white/40 mt-0.5">
            {d.toLocaleString("es-CL", { month: "short", timeZone: "America/Santiago" })}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border border-white/10 text-white/45">
              {CALENDAR_EVENT_TYPE_LABELS[ev.type]}
            </span>
            {hasAmount && (
              <Badge tone={tone} solid={status !== "none"}>
                {formatClp(ev.amount_clp)}
                {status !== "none" && ` · ${PAYMENT_STATUS_LABELS[status]}`}
              </Badge>
            )}
          </div>
          <div className="font-mono text-[11px] text-white/40 mt-1">
            {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
            {ev.location ? ` · ${ev.location}` : ""}
          </div>
          {ev.description && (
            <div className="text-xs text-white/35 mt-1 truncate">
              {ev.description}
            </div>
          )}

          {/* Sprint 19 — Highlight notas privadas del contacto */}
          {privateNote && (
            <div
              className="mt-3 rounded-lg p-2.5 relative"
              style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.08)" }}
            >
              <div className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-orange text-ink px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider">
                <Lock className="w-2.5 h-2.5" aria-hidden="true" />
                RECUERDA
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1 text-white/80">
                {privateNote}
              </p>
            </div>
          )}
        </div>

        {/* Sprint 24 — Editor general (todos los tipos) + Sprint 19 finance
            (también todos: bug fix 2026-06-02, antes estaba gateado a `isShow`
            pero el sync re-clasificaba shows a "otro" y la usuaria perdía
            acceso a editar el fee) + Sprint 21 tracklist (solo shows, único
            caso donde el tipo importa para la UX). */}
        <div className="flex flex-col gap-1 shrink-0">
          <EventEditDialog
            eventId={ev.id}
            current={{
              type: ev.type,
              title: ev.title,
              description: ev.description,
              location: ev.location,
              start_at: ev.start_at,
              end_at: ev.end_at,
              all_day: ev.all_day,
            }}
          />
          <FinanceEditDialog
            eventId={ev.id}
            title={ev.title}
            current={{
              amount_clp: ev.amount_clp,
              payment_status: ev.payment_status,
              document_type: ev.document_type,
            }}
          />
          {isShow && (
            <Link
              href={`/calendario/${ev.id}/tracklist`}
              className="hos-clay-btn inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-orange transition-colors"
              title="Editar tracklist del set"
            >
              <ListMusic className="w-3 h-3" />
              Tracklist
            </Link>
          )}
          {isShow && (
            <Link
              href={`/calendario/${ev.id}/evento`}
              className="hos-clay-btn inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-orange transition-colors"
              title="Publicar como evento público + RSVP"
            >
              <Globe className="w-3 h-3" />
              Evento
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
