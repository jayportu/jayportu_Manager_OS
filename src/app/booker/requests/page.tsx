import Link from "next/link";
import { listMyBookerRequests } from "@/lib/queries/booker";
import { BOOKING_STATUS_LABELS } from "@/types/database";
import { dateTime, shortDate } from "@/lib/format";
import { Inbox, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Badge, EmptyState } from "@/components/hos";

/**
 * Bloque B · B4a — Inbox del Booker.
 *
 * Lista todos los bookings que el booker logueado mandó (linkeados por
 * booker_user_id, con backfill por email desde el layout).
 *
 * Sin filtros por status en v1 — todos visibles ordenados por fecha desc.
 */
export const dynamic = "force-dynamic";

const STATUS_TONES: Record<string, "up" | "warn" | "down" | "info" | "neutral"> = {
  nuevo: "info",
  leido: "neutral",
  respondido: "neutral",
  cotizado: "warn",
  agendado: "up",
  rechazado: "down",
};

export default async function BookerRequestsPage() {
  const bookings = await listMyBookerRequests();

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      {/* Hero */}
      <GlassPanel padded={false} className="mb-6 p-6 md:p-7">
        <MonoLabel>MIS REQUESTS</MonoLabel>
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
          <Button asChild variant="clay">
            <Link href="/booker/buscar">
              <Plus className="w-4 h-4" />
              Buscar DJs
            </Link>
          </Button>
        </div>
        <p className="text-sm text-white/55 mt-2 max-w-xl">
          Todos los DJs que contactaste desde la web — su estado se
          actualiza en vivo a medida que el DJ revisa, cotiza y agenda.
        </p>
      </GlassPanel>

      {/* Lista */}
      {bookings.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="SIN REQUESTS TODAVÍA"
          sub="Cuando contactes un DJ desde su press kit, su request va a aparecer acá con el estado en vivo."
          action={
            <Button asChild variant="clay" size="lg">
              <Link href="/booker/buscar">
                Buscar DJs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const tone = STATUS_TONES[b.status] ?? "neutral";
            return (
              <GlassPanel
                key={b.id}
                sweep
                className="transition-colors hover:border-white/30"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge tone={tone}>
                        {BOOKING_STATUS_LABELS[b.status] ?? b.status}
                      </Badge>
                      <span className="font-mono text-[10px] text-white/40 tracking-wider">
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
                        <span className="text-white/50 ml-2">
                          · {shortDate(b.event_date)}
                        </span>
                      )}
                    </h2>
                    {b.venue && (
                      <div className="text-sm text-white/80 mt-0.5">
                        Venue: {b.venue}
                      </div>
                    )}
                    {b.message && (
                      <p className="text-sm text-white/55 mt-2 line-clamp-2">
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
                  <Button asChild variant="clay" size="sm" className="shrink-0">
                    <Link href={`/b/${b.view_token}`}>
                      Ver detalle
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
