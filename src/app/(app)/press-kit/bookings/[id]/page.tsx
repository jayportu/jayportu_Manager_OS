import { listBookings } from "@/lib/queries/presskit";
import { getBookerCredibility } from "@/lib/queries/booker";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { GlassPanel, MonoLabel } from "@/components/hos";
import { BOOKING_STATUS_LABELS } from "@/types/database";
import { BookingActions } from "./booking-actions";
import { CounterofferResponse } from "./counteroffer-response";
import { BookingTimeline } from "@/components/booking/booking-timeline";
import { BookerCredibilityCard } from "@/components/booking/booker-credibility-card";
import { dateTime, shortDate, whatsappLink } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BookingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const all = await listBookings();
  const booking = all.find((b) => b.id === id);
  if (!booking) notFound();

  const wa = whatsappLink(booking.phone);
  const mailto = booking.email ? `mailto:${booking.email}` : null;

  // Fase 2 booker — ficha de credibilidad si el request vino de un booker con cuenta
  const bookerCredibility = booking.booker_user_id
    ? await getBookerCredibility(booking.booker_user_id)
    : null;

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/press-kit"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Volver a Press kit
      </Link>

      <header className="mb-6">
        <MonoLabel>Press kit · Booking</MonoLabel>
        <h1 className="mt-1.5 font-display text-4xl leading-[0.9] tracking-tight md:text-5xl">
          Booking de {booking.name}
          <span className="text-orange">.</span>
        </h1>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-white/45">
          Recibido {dateTime(booking.created_at)} · Estado:{" "}
          <span className="text-orange">
            {BOOKING_STATUS_LABELS[booking.status]}
          </span>
        </p>
      </header>

      {/* Fase 2 booker — Quién te escribe (solo si vino de un booker con cuenta) */}
      {bookerCredibility && <BookerCredibilityCard data={bookerCredibility} />}

      {/* Datos */}
      <GlassPanel className="mb-5">
        <MonoLabel>Solicitud</MonoLabel>
        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <Field label="Nombre" value={booking.name} />
          <Field label="Email" value={booking.email} link={mailto || undefined} />
          <Field
            label="Teléfono / WhatsApp"
            value={booking.phone}
            link={wa || undefined}
            external={!!wa}
          />
          <Field label="Tipo de evento" value={booking.event_type} />
          <Field
            label="Fecha"
            value={booking.event_date ? shortDate(booking.event_date) : ""}
          />
          <Field label="Venue / lugar" value={booking.venue} />
        </div>
        {booking.message && (
          <div className="mt-4">
            <div className="font-mono text-[9px] uppercase tracking-wider text-white/40 mb-1">
              Mensaje
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed p-3 rounded-xl border border-white/10 bg-white/[0.03]">
              {booking.message}
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Bloque C — Counteroffer del booker (si aplica) */}
      {booking.status === "contraofertado" && (
        <CounterofferResponse
          bookingId={booking.id}
          counterAmount={booking.counter_amount_clp}
          counterDate={booking.counter_event_date}
          counterMessage={booking.counter_message}
          counterAt={booking.counter_at}
          originalDate={booking.event_date}
          quotedAmount={booking.quoted_amount_clp}
        />
      )}

      {/* Timeline visual del booking */}
      <div className="mb-5">
        <BookingTimeline booking={booking} perspective="dj" />
      </div>

      {/* Acciones */}
      <BookingActions
        id={booking.id}
        status={booking.status}
        contactId={booking.created_contact_id}
        quotedAmountClp={booking.quoted_amount_clp}
        notesInternal={booking.notes_internal}
        eventDate={booking.event_date}
        hasFollowUp={!!booking.follow_up_id}
        hasCalendarEvent={!!booking.calendar_event_id}
      />

      {booking.created_contact_id && (
        <GlassPanel className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-white/55">
              Ya está en tu CRM como contacto.
            </div>
            <Link
              href={`/crm/${booking.created_contact_id}`}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-orange hover:text-white"
            >
              Ver contacto <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  link,
  external,
}: {
  label: string;
  value: string;
  link?: string;
  external?: boolean;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-white/40 mb-1">
        {label}
      </div>
      {value ? (
        link ? (
          <a
            href={link}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="text-sm text-white/80 hover:text-orange inline-flex items-center gap-1"
          >
            {value}
            {external && <ExternalLink className="w-3 h-3" />}
          </a>
        ) : (
          <div className="text-sm text-white/80">{value}</div>
        )
      ) : (
        <div className="text-sm text-white/30">—</div>
      )}
    </div>
  );
}
