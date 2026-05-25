import { listBookings } from "@/lib/queries/presskit";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BOOKING_STATUS_LABELS } from "@/types/database";
import { BookingActions } from "./booking-actions";
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

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/press-kit"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Press kit
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
        Booking de {booking.name}
      </h1>
      <p className="text-sm text-fg-muted mb-8">
        Recibido {dateTime(booking.created_at)} · Estado:{" "}
        <span className="text-fg">{BOOKING_STATUS_LABELS[booking.status]}</span>
      </p>

      {/* Datos */}
      <Card className="p-6 mb-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
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
          <div>
            <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1">
              Mensaje
            </div>
            <div className="text-sm whitespace-pre-wrap leading-relaxed p-3 bg-bg rounded border border-border">
              {booking.message}
            </div>
          </div>
        )}
      </Card>

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
        <Card className="p-4 mt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-fg-muted">
              Ya está en tu CRM como contacto.
            </div>
            <Link
              href={`/crm/${booking.created_contact_id}`}
              className="text-sm text-accent hover:underline inline-flex items-center gap-1"
            >
              Ver contacto <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </Card>
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
      <div className="text-[11px] uppercase tracking-wider text-fg-muted mb-1">
        {label}
      </div>
      {value ? (
        link ? (
          <a
            href={link}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className="text-sm text-fg hover:text-accent inline-flex items-center gap-1"
          >
            {value}
            {external && <ExternalLink className="w-3 h-3" />}
          </a>
        ) : (
          <div className="text-sm text-fg">{value}</div>
        )
      ) : (
        <div className="text-sm text-fg-subtle">—</div>
      )}
    </div>
  );
}
