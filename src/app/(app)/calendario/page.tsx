import {
  listMyEvents,
  CALENDAR_EVENT_TYPE_LABELS,
  getFinanceKpis,
} from "@/lib/queries/calendar-events";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Calendar, AlertCircle, Download, ListMusic, Globe } from "lucide-react";
import Link from "next/link";
import { SyncButton } from "./sync-button";
import { NewEventButton } from "./new-event-button";
import { AutoSync } from "./auto-sync";
import { FinanceEditDialog } from "./finance-edit";
import { EventEditDialog } from "./event-edit";
import { dateTime, shortDate, relativeTime } from "@/lib/format";
import {
  PAYMENT_STATUS_LABELS,
  type CalendarEventRow,
  type PaymentStatus,
} from "@/lib/calendar/types";

interface PageProps {
  searchParams: Promise<{ error?: string; synced?: string }>;
}

function formatClp(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-CL")}`;
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
  const privateNotes = await getContactPrivateNotes(contactIds);

  const upcoming = events.filter((e) => new Date(e.start_at) >= now);
  const past = events.filter((e) => new Date(e.start_at) < now);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {conn && <AutoSync lastSyncAt={conn.last_sync_at} staleMinutes={5} />}

      {/* Hero brutalist */}
      <div className="border-2 border-border bg-bg-panel p-6 mb-5 relative">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — CALENDARIO · GIGS Y EVENTOS
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          AGENDA<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2">
          {upcoming.length} próximos · {past.length} pasados
          {conn && (
            <>
              {" "}· conectado a{" "}
              <span className="text-fg">{conn.google_email}</span>
            </>
          )}
        </p>
        {conn ? (
          <p className="font-mono text-[10px] text-fg-subtle mt-1">
            Última sync: {relativeTime(conn.last_sync_at)} · auto al abrir
          </p>
        ) : (
          <p className="font-mono text-[10px] text-fg-subtle mt-1">
            Tip:{" "}
            <Link href="/configuracion" className="text-orange hover:underline">
              conecta Google
            </Link>{" "}
            para sincronizar tus shows automáticamente (opcional).
          </p>
        )}
        <div className="mt-4 flex gap-2 flex-wrap items-center">
          {conn && <SyncButton />}
          <NewEventButton />
          <a
            href={`/api/export/finance?from=${now.getFullYear()}-01-01&to=${now.getFullYear() + 1}-01-01`}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3 py-2 border-2 border-border bg-cream hover:bg-ink hover:text-orange transition-colors"
            download
            title="Exportar CSV de finanzas año actual"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </a>
        </div>
      </div>

      {/* Sprint 19 — KPIs financieros del mes */}
      {kpis.totalGigs > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-border mb-5">
          <div className="bg-bg-panel p-4 border-t-2 border-t-accent border-r-2 border-border border-b-2 md:border-b-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
              — COBRADO ESTE MES
            </div>
            <div className="font-display text-3xl leading-none mt-2 text-accent">
              {formatClp(kpis.totalCobrado)}
            </div>
            <div className="font-mono text-[10px] mt-2 text-fg-muted">
              {kpis.gigsPagados} {kpis.gigsPagados === 1 ? "gig" : "gigs"} CLP
            </div>
          </div>
          <div className="bg-bg-panel p-4 md:border-r-2 border-border border-b-2 md:border-b-0">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
              — TOTAL GIGS
            </div>
            <div className="font-display text-3xl leading-none mt-2 text-fg">
              {kpis.totalGigs.toString().padStart(2, "0")}
            </div>
            <div className="font-mono text-[10px] mt-2 text-fg-muted">
              {kpis.monthLabel.toUpperCase()}
            </div>
          </div>
          <div className="bg-bg-panel p-4 border-r-2 border-border">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted">
              — PROMEDIO / GIG
            </div>
            <div className="font-display text-3xl leading-none mt-2 text-fg">
              {kpis.avgPerGig > 0 ? formatClp(kpis.avgPerGig) : "—"}
            </div>
            <div className="font-mono text-[10px] mt-2 text-fg-muted">SOLO PAGADOS</div>
          </div>
          <div className="bg-bg-panel p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
              — PENDIENTE COBRO
            </div>
            <div className="font-display text-3xl leading-none mt-2 text-warning">
              {kpis.totalPendiente > 0 ? formatClp(kpis.totalPendiente) : "—"}
            </div>
            <div className="font-mono text-[10px] mt-2 text-warning">
              {kpis.gigsPendientes}{" "}
              {kpis.gigsPendientes === 1 ? "venue debe" : "venues deben"}
            </div>
          </div>
        </div>
      )}

      {sp.error && (
        <Card className="p-4 mb-5 bg-danger/10 border-2 border-danger">
          <div className="flex gap-2 text-sm text-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">Error</div>
              <div className="text-xs mt-1 opacity-80">{sp.error}</div>
            </div>
          </div>
        </Card>
      )}

      {sp.synced && (
        <Card className="p-3 mb-4 bg-success/10 border-2 border-success">
          <div className="text-sm text-success">
            ✓ {sp.synced} eventos revisados desde Google Calendar.
          </div>
        </Card>
      )}

      {events.length === 0 && (
        <Card className="p-10 text-center">
          <Calendar className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin eventos aún</h3>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
            Crea tu primer evento
            {conn
              ? " o sincroniza tu Google Calendar para traer los existentes."
              : "."}
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {conn && <SyncButton />}
            <NewEventButton />
          </div>
        </Card>
      )}

      {/* Próximos */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
            — PRÓXIMOS
          </h2>
          <ul className="space-y-2">
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
      {past.length > 0 && (
        <section className="mb-8">
          <details>
            <summary className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-3 cursor-pointer">
              — ÚLTIMOS 30 DÍAS ({past.length})
            </summary>
            <ul className="space-y-2 mt-3">
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

  // Tinte según estado de pago (solo si tiene amount o status != none)
  let tint = "border-border bg-bg-panel";
  if (hasAmount && status === "paid") tint = "border-success bg-success/5";
  else if (hasAmount && status === "pending") tint = "border-warning bg-warning/5";
  else if (hasAmount && status === "partial") tint = "border-info bg-info/5";

  return (
    <li className={`border-2 ${tint} px-4 py-3`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center min-w-[44px]">
          <div className="font-display text-2xl leading-none text-orange">
            {dayInTz}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-fg-muted mt-0.5">
            {d.toLocaleString("es-CL", { month: "short", timeZone: "America/Santiago" })}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-border bg-cream">
              {CALENDAR_EVENT_TYPE_LABELS[ev.type]}
            </span>
            {hasAmount && (
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-border ${
                  status === "paid"
                    ? "bg-success text-white"
                    : status === "pending"
                    ? "bg-warning text-white"
                    : status === "partial"
                    ? "bg-info text-white"
                    : "bg-cream"
                }`}
              >
                {formatClp(ev.amount_clp)}
                {status !== "none" && ` · ${PAYMENT_STATUS_LABELS[status]}`}
              </span>
            )}
          </div>
          <div className="font-mono text-[11px] text-fg-muted mt-1">
            {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
            {ev.location ? ` · ${ev.location}` : ""}
          </div>
          {ev.description && (
            <div className="text-xs text-fg-subtle mt-1 truncate">
              {ev.description}
            </div>
          )}

          {/* Sprint 19 — Highlight notas privadas del contacto */}
          {privateNote && (
            <div className="mt-3 p-2.5 bg-ink text-white border-2 border-border relative">
              <div className="absolute -top-2 left-3 bg-orange text-ink px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider">
                🔒 RECUERDA
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1">
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
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 border-2 border-border bg-cream hover:bg-ink hover:text-orange font-mono text-[10px] font-bold uppercase tracking-wider transition-colors"
              title="Editar tracklist del set"
            >
              <ListMusic className="w-3 h-3" />
              Tracklist
            </Link>
          )}
          {isShow && (
            <Link
              href={`/calendario/${ev.id}/evento`}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 border-2 border-border bg-cream hover:bg-ink hover:text-orange font-mono text-[10px] font-bold uppercase tracking-wider transition-colors"
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
