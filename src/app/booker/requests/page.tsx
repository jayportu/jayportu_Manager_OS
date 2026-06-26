import Link from "next/link";
import { listMyBookerRequests } from "@/lib/queries/booker";
import { BOOKING_STATUS_LABELS } from "@/types/database";
import { dateTime, shortDate } from "@/lib/format";
import { Inbox, ArrowRight, Plus } from "lucide-react";

/**
 * Bloque B · B4a — Inbox del Booker.
 *
 * Lista todos los bookings que el booker logueado mandó (linkeados por
 * booker_user_id, con backfill por email desde el layout).
 *
 * Sin filtros por status en v1 — todos visibles ordenados por fecha desc.
 */
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  nuevo: "bg-orange text-ink border-orange",
  leido: "bg-info text-white border-info",
  respondido: "bg-cream text-ink border-ink",
  cotizado: "bg-warning text-white border-warning",
  agendado: "bg-success text-white border-success",
  rechazado: "bg-danger text-white border-danger",
};

export default async function BookerRequestsPage() {
  const bookings = await listMyBookerRequests();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="border-2 border-ink bg-bg-panel p-6 md:p-7 mb-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — MIS REQUESTS
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-3 justify-between">
          <h1
            className="leading-none"
            style={{
              fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
              fontSize: "56px",
              letterSpacing: "-0.005em",
            }}
          >
            INBOX<span className="text-orange">.</span>
          </h1>
          <Link
            href="/booker/buscar"
            className="inline-flex items-center gap-2 px-4 py-2 bg-ink text-cream font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
          >
            <Plus className="w-4 h-4" />
            Buscar DJs
          </Link>
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Todos los DJs que contactaste desde la web — su estado se
          actualiza en vivo a medida que el DJ revisa, cotiza y agenda.
        </p>
      </div>

      {/* Lista */}
      {bookings.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const styleClass = STATUS_STYLES[b.status] ?? "bg-cream text-ink border-ink";
            return (
              <article
                key={b.id}
                className="border-2 border-ink bg-bg-panel p-5 hover:bg-cream/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-[0.12em] px-2 py-0.5 border-2 ${styleClass}`}
                      >
                        {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                      </span>
                      <span className="font-mono text-[10px] text-fg-subtle tracking-wider">
                        ENVIADO {dateTime(b.created_at)}
                      </span>
                    </div>
                    <h2
                      className="mt-2 leading-tight"
                      style={{
                        fontFamily:
                          "var(--font-anton), Impact, system-ui, sans-serif",
                        fontSize: "26px",
                      }}
                    >
                      {b.event_type || "Booking"}
                      {b.event_date && (
                        <span className="text-fg-muted ml-2">
                          · {shortDate(b.event_date)}
                        </span>
                      )}
                    </h2>
                    {b.venue && (
                      <div className="text-sm text-fg mt-0.5">
                        Venue: {b.venue}
                      </div>
                    )}
                    {b.message && (
                      <p className="text-sm text-fg-muted mt-2 line-clamp-2">
                        “{b.message}”
                      </p>
                    )}
                    {b.quoted_amount_clp && b.quoted_amount_clp > 0 && (
                      <div className="mt-2 font-mono text-xs text-orange font-bold">
                        Cotizado: $
                        {b.quoted_amount_clp.toLocaleString("es-CL")} CLP
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/b/${b.view_token}`}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 border-2 border-ink font-mono text-[10px] font-bold tracking-wider uppercase hover:bg-orange hover:border-orange transition-colors"
                  >
                    Ver detalle
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border-2 border-dashed border-ink bg-bg-panel p-10 text-center">
      <Inbox className="w-12 h-12 mx-auto text-fg-subtle mb-4" />
      <h2
        className="leading-tight mb-2"
        style={{
          fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
          fontSize: "32px",
        }}
      >
        SIN REQUESTS TODAVÍA
      </h2>
      <p className="text-sm text-fg-muted max-w-md mx-auto mb-6">
        Cuando contactes un DJ desde su press kit, su request va a aparecer
        acá con el estado en vivo.
      </p>
      <Link
        href="/dj"
        className="inline-flex items-center gap-2 px-5 py-3 bg-ink text-cream font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-ink hover:bg-orange hover:text-ink hover:border-orange transition-colors"
      >
        Buscar DJs
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
