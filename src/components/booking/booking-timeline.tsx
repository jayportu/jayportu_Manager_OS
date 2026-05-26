/**
 * Bloque C · C3 — Timeline de un booking.
 *
 * Componente puro server-rendereable. Recibe el booking y renderiza
 * los eventos en orden cronológico (Sprint 3 → Sprint 20 → Bloque C).
 * Reutilizado en:
 *   - /b/[token]    (Booker view)
 *   - /press-kit/bookings/[id]   (DJ view)
 *
 * Estilo: brutalist DROP. con línea vertical naranja y nodos cuadrados.
 */
import type { BookingSubmission } from "@/types/database";
import { dateTime, shortDate } from "@/lib/format";

interface Props {
  booking: BookingSubmission;
  /** Si true, los nombres de actores cambian para vista del DJ. */
  perspective?: "dj" | "booker";
}

interface TimelineEvent {
  at: string;
  title: string;
  detail?: string;
  variant: "neutral" | "info" | "warn" | "success" | "danger";
}

function fmtCLP(n: number | null): string {
  if (!n) return "—";
  return `$${n.toLocaleString("es-CL")} CLP`;
}

export function BookingTimeline({ booking, perspective = "booker" }: Props) {
  const isDj = perspective === "dj";
  const events: TimelineEvent[] = [];

  // 1. Created → request mandado
  events.push({
    at: booking.created_at,
    title: isDj ? "Booker mandó request" : "Mandaste el request",
    detail: booking.event_type
      ? `${booking.event_type}${booking.event_date ? ` · ${shortDate(booking.event_date)}` : ""}`
      : undefined,
    variant: "neutral",
  });

  // 2. Responded → DJ pasó a 'respondido' (Bloque C: responded_at)
  if (booking.responded_at) {
    events.push({
      at: booking.responded_at,
      title: isDj ? "Marcaste como respondido" : "El DJ respondió tu mensaje",
      variant: "info",
    });
  }

  // 3. Quoted → DJ cotizó
  if (booking.quoted_at) {
    events.push({
      at: booking.quoted_at,
      title: isDj ? "Cotizaste el evento" : "El DJ te cotizó",
      detail: booking.quoted_amount_clp
        ? `Monto: ${fmtCLP(booking.quoted_amount_clp)}`
        : undefined,
      variant: "warn",
    });
  }

  // 4. Counter → booker contraofertó
  if (booking.counter_at) {
    const detail: string[] = [];
    if (booking.counter_amount_clp) {
      detail.push(`Nuevo monto: ${fmtCLP(booking.counter_amount_clp)}`);
    }
    if (booking.counter_event_date) {
      detail.push(`Nueva fecha: ${shortDate(booking.counter_event_date)}`);
    }
    events.push({
      at: booking.counter_at,
      title: isDj ? "Booker te contraofertó" : "Mandaste tu contraoferta",
      detail: detail.length > 0 ? detail.join(" · ") : booking.counter_message,
      variant: "warn",
    });
  }

  // 5. Agendado
  if (booking.agendado_at) {
    events.push({
      at: booking.agendado_at,
      title: isDj ? "Agendaste el evento" : "Tu evento fue agendado",
      detail: "Pendiente: contrato + pago (próximos bloques)",
      variant: "success",
    });
  }

  // 6. Rechazado: usamos updated_at + status como aproximación (no hay
  // timestamp dedicado). Solo lo agregamos si el status final es rechazado.
  if (booking.status === "rechazado") {
    events.push({
      at: booking.updated_at,
      title: isDj ? "Rechazaste el request" : "El DJ rechazó tu request",
      variant: "danger",
    });
  }

  // Orden cronológico
  events.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="border-2 border-ink bg-white p-5">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange mb-4">
        — TIMELINE
      </div>
      <ol className="relative space-y-5">
        {/* Línea vertical */}
        <span
          aria-hidden="true"
          className="absolute left-[5px] top-1 bottom-1 w-px bg-ink/20"
        />
        {events.map((ev, i) => (
          <TimelineNode key={`${ev.at}-${i}`} event={ev} isLast={i === events.length - 1} />
        ))}
      </ol>
    </div>
  );
}

function TimelineNode({
  event,
  isLast,
}: {
  event: TimelineEvent;
  isLast: boolean;
}) {
  const variantClass: Record<TimelineEvent["variant"], string> = {
    neutral: "bg-ink",
    info: "bg-info",
    warn: "bg-warning",
    success: "bg-success",
    danger: "bg-danger",
  };
  return (
    <li className="relative pl-6">
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1 w-3 h-3 ${variantClass[event.variant]} border-2 border-ink`}
      />
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-subtle">
        {dateTime(event.at)}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-ink">{event.title}</div>
      {event.detail && (
        <div className="mt-0.5 text-xs text-fg-muted leading-relaxed">
          {event.detail}
        </div>
      )}
      {isLast && event.variant !== "success" && event.variant !== "danger" && (
        <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-orange">
          → siguiente paso
        </div>
      )}
    </li>
  );
}
