import { listMyEvents, CALENDAR_EVENT_TYPE_LABELS } from "@/lib/queries/calendar-events";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";
import { SyncButton } from "./sync-button";
import { NewEventButton } from "./new-event-button";
import { dateTime, shortDate } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ error?: string; synced?: string }>;
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

  const events = await listMyEvents({
    fromISO: past30.toISOString(),
    toISO: future120.toISOString(),
  });

  // Agrupar por mes
  const groups = new Map<string, typeof events>();
  for (const ev of events) {
    const d = new Date(ev.start_at);
    const key = d.toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ev);
  }

  const upcoming = events.filter((e) => new Date(e.start_at) >= now);
  const past = events.filter((e) => new Date(e.start_at) < now);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Calendario
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {upcoming.length} próximos · {past.length} pasados · conectado a{" "}
            <span className="text-fg">{conn.google_email}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <SyncButton />
          <NewEventButton />
        </div>
      </div>

      {sp.error && (
        <Card className="p-4 mb-5 bg-danger/10 border-danger/30">
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
        <Card className="p-3 mb-4 bg-success/10 border-success/30">
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
          <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3">
            Próximos
          </h2>
          <Card className="overflow-hidden">
            <ul>
              {upcoming.map((ev, i) => (
                <EventRow key={ev.id} ev={ev} isFirst={i === 0} />
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* Pasados (últimos 30 días) */}
      {past.length > 0 && (
        <section className="mb-8">
          <details>
            <summary className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3 cursor-pointer hover:text-fg">
              Últimos 30 días ({past.length})
            </summary>
            <Card className="overflow-hidden mt-3">
              <ul>
                {past
                  .slice()
                  .reverse()
                  .map((ev, i) => (
                    <EventRow key={ev.id} ev={ev} isFirst={i === 0} />
                  ))}
              </ul>
            </Card>
          </details>
        </section>
      )}
    </div>
  );
}

function EventRow({
  ev,
  isFirst,
}: {
  ev: import("@/lib/queries/calendar-events").CalendarEventRow;
  isFirst: boolean;
}) {
  const d = new Date(ev.start_at);
  return (
    <li
      className={`flex items-center gap-4 px-4 py-3 ${
        !isFirst ? "border-t border-border" : ""
      } hover:bg-bg-subtle transition-colors`}
    >
      <div className="flex flex-col items-center min-w-[44px]">
        <div className="font-display text-2xl leading-none text-accent">
          {d.getDate().toString().padStart(2, "0")}
        </div>
        <div className="text-[10px] uppercase tracking-widest text-fg-muted mt-0.5">
          {d.toLocaleString("es-CL", { month: "short" })}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{ev.title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-fg-muted border border-border">
            {CALENDAR_EVENT_TYPE_LABELS[ev.type]}
          </span>
        </div>
        <div className="text-xs text-fg-muted mt-0.5">
          {ev.all_day ? shortDate(ev.start_at) : dateTime(ev.start_at)}
          {ev.location ? ` · ${ev.location}` : ""}
        </div>
        {ev.description && (
          <div className="text-xs text-fg-subtle mt-1 truncate">
            {ev.description}
          </div>
        )}
      </div>
    </li>
  );
}
