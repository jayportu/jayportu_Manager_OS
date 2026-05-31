import {
  listMyEvents,
  CALENDAR_EVENT_TYPE_LABELS,
  getFinanceKpis,
} from "@/lib/queries/calendar-events";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle, Download, ListMusic } from "lucide-react";
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

  // Si no hay conexión Google: mostrar CTA para conectar
  if (!conn) {
    return (
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
          Calendario
        </h1>
        <Card className="p-8 text-center mt-6">
          <Calendar className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
          <h3 className="font-semibold text-lg mb-1">Google Calendar no conectado</h3>
          <p className="text-sm text-fg-muted mb-6 max-w-md mx-auto">
            Conecta tu Google para sincronizar shows confirmados, reuniones,
            follow-ups y bloqueos de disponibilidad.
          </p>
          <Button asChild>
            <Link href="/configuracion">Ir a configuración</Link>
          </Button>
        </Card>
      </div>
    );
  }

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
      <AutoSync lastSyncAt={conn.last_sync_at} staleMinutes={5} />

      {/* Hero brutalist */}
      <div className="border-2 border-ink bg-white p-6 mb-5 relative">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — CALENDARIO · GIGS Y EVENTOS
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          AGENDA<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2">
          {upcoming.length} próximos · {past.length} pasados · conectado a{" "}
          <span className="text-ink">{conn.google_email}</span>
        </p>
        <p className="font-mono text-[10px] text-fg-subtle mt-1">
          Última sync: {relativeTime(conn.last_sync_at)} · auto al abrir
        </p>
        <div className="mt-4 flex gap-2 flex-wrap items-center">
          <SyncButton />
          <NewEventButton />
          <a
            href={`/api/export/finance?from=${now.getFullYear()}-01-01&to=${now.getFullYear() + 1}-01-01`}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3 py-2 border-2 border-ink bg-cream hover:bg-ink hover:text-orange transition-colors"
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
        <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink mb-5">
          <div className="bg-success text-white p-4 border-r-2 border-ink">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
              — COBRADO ESTE MES
            </div>
            <div className="font-display text-3xl leading-none mt-2">
              {formatClp(kpis.totalCobrado)}
            </div>
            <div className="font-mono text-[10px] mt-2 opacity-90">
              {kpis.gigsPagados} {kpis.gigsPagados === 1 ? "gig" : "gigs"} CLP
            </div>
          </div>
          <div className="bg-white p-4 border-r-2 border-ink">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
              — TOTAL GIGS
            </div>
            <div className="font-display text-3xl leading-none mt-2">
              {kpis.totalGigs.toString().padStart(2, "0")}
            </div>
            <div className="font-mono text-[10px] mt-2 text-fg-muted">
              {kpis.monthLabel.toUpperCase()}
            </div>
          </div>
          <div className="bg-orange p-4 border-r-2 border-ink">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
              — PROMEDIO / GIG
            </div>
            <div className="font-display text-3xl leading-none mt-2">
              {kpis.avgPerGig > 0 ? formatClp(kpis.avgPerGig) : "—"}
            </div>
            <div className="font-mono text-[10px] mt-2">SOLO PAGADOS</div>
          </div>
          <div className="bg-ink p-4 text-cream">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-warning">
              — PENDIENTE COBRO
            </div>
            <div className="font-display text-3xl leading-none mt-2">
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
            ✓ {sp.synced} eventos sincronizados desde Google Calendar.
          </div>
        </Card>
      )}

      {events.length === 0 && (
        <Card className="p-10 text-center">
          <Calendar className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin eventos aún</h3>
          <p className="text-sm text-fg-muted mb-5 max-w-md mx-auto">
            Sincroniza tu Google Calendar para traer eventos existentes, o crea
            uno nuevo.
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            <SyncButton />
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
  const d = new Date(ev.start_at);
  const isShow = ev.type === "show";
  const hasAmount = ev.amount_clp !== null && ev.amount_clp > 0;
  const status: PaymentStatus = ev.payment_status;

  // Tinte según estado de pago (solo si tiene amount o status != none)
  let tint = "border-ink bg-white";
  if (hasAmount && status === "paid") tint = "border-success bg-success/5";
  else if (hasAmount && status === "pending") tint = "border-warning bg-warning/5";
  else if (hasAmount && status === "partial") tint = "border-info bg-info/5";

  return (
    <li className={`border-2 ${tint} px-4 py-3`}>
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center min-w-[44px]">
          <div className="font-display text-2xl leading-none text-orange">
            {d.getDate().toString().padStart(2, "0")}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-fg-muted mt-0.5">
            {d.toLocaleString("es-CL", { month: "short", timeZone: "America/Santiago" })}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{ev.title}</span>
            <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-ink bg-cream">
              {CALENDAR_EVENT_TYPE_LABELS[ev.type]}
            </span>
            {hasAmount && (
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border-2 border-ink ${
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
            <div className="mt-3 p-2.5 bg-ink text-cream border-2 border-ink relative">
              <div className="absolute -top-2 left-3 bg-orange text-ink px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wider">
                🔒 RECUERDA
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap mt-1">
                {privateNote}
              </p>
            </div>
          )}
        </div>

        {/* Sprint 24 — Editor general (todos los tipos) + Sprint 19 finance + Sprint 21 tracklist (solo shows) */}
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
          {isShow && (
            <>
              <FinanceEditDialog
                eventId={ev.id}
                title={ev.title}
                current={{
                  amount_clp: ev.amount_clp,
                  payment_status: ev.payment_status,
                  document_type: ev.document_type,
                }}
              />
              <Link
                href={`/calendario/${ev.id}/tracklist`}
                className="inline-flex items-center justify-center gap-1.5 h-8 px-3 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[10px] font-bold uppercase tracking-wider transition-colors"
                title="Editar tracklist del set"
              >
                <ListMusic className="w-3 h-3" />
                Tracklist
              </Link>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
