import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBookingByViewToken } from "@/lib/queries/presskit";
import { createClient } from "@/lib/supabase/server";
import { BookingTimeline } from "@/components/booking/booking-timeline";
import { CounterofferForm } from "./counteroffer-form";
import { dateTime, shortDate } from "@/lib/format";

/**
 * Bloque B · B6 — Vista pública del request para el Booker.
 *
 * Acceso sin login: cualquiera con el token puede ver el estado del
 * request. El token va en el email de confirmación (futuro) y en la
 * página /booker/requests para usuarios logueados.
 *
 * Diseño "billete de tickete": estado grande arriba, datos del booking,
 * datos del DJ contactado, y CTAs según contexto:
 *   - Anon → CTA "Crear cuenta para ver todos mis requests"
 *   - Booker logueado (match) → CTA "Ver en mi inbox" (link a /booker/requests)
 *   - Booker logueado (no match) → solo info (raro pero posible)
 */
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  const b = await getBookingByViewToken(token);
  if (!b) return { title: "Request no encontrado · DROP." };
  return {
    title: `Tu request con ${b.dj_artist_name} · DROP.`,
    robots: { index: false, follow: false }, // no SEO para vistas tokenizadas
  };
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; border: string; tag: string }
> = {
  nuevo: { bg: "bg-orange", text: "text-ink", border: "border-orange", tag: "Pendiente de revisión" },
  leido: { bg: "bg-info", text: "text-white", border: "border-info", tag: "Leído por el DJ" },
  respondido: { bg: "bg-cream", text: "text-fg", border: "border-border", tag: "Respondido" },
  cotizado: { bg: "bg-warning", text: "text-white", border: "border-warning", tag: "Cotizado" },
  contraofertado: { bg: "bg-ink", text: "text-white", border: "border-border", tag: "Contraoferta enviada" },
  agendado: { bg: "bg-success", text: "text-white", border: "border-success", tag: "Agendado ✓" },
  rechazado: { bg: "bg-danger", text: "text-white", border: "border-danger", tag: "No disponible" },
};

export default async function BookerViewTokenPage({ params }: PageProps) {
  const { token } = await params;
  const booking = await getBookingByViewToken(token);
  if (!booking) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user && user.id === booking.booker_user_id;
  const isAnon = !user;

  const style = STATUS_STYLES[booking.status] ?? STATUS_STYLES.nuevo;

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-ink text-white border-b-2 border-orange py-4 px-6 flex items-center justify-between">
        <Link
          href="/"
          className="select-none flex items-baseline gap-3 hover:opacity-90 transition-opacity"
        >
          <span
            style={{
              fontFamily: "var(--font-satoshi), system-ui, sans-serif",
              fontSize: "26px",
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: "-0.02em",
            }}
          >
            DROP<span className="text-orange" style={{ marginLeft: "-0.06em" }}>.</span>
          </span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-orange hidden sm:inline">
            BOOKING REQUEST
          </span>
        </Link>
      </header>

      <div className="flex-1 px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Status hero */}
          <div className={`border-2 ${style.border} ${style.bg} ${style.text} p-6 md:p-8 mb-6`}>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] opacity-80 mb-2">
              — ESTADO DEL REQUEST
            </div>
            <div
              style={{
                fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "44px",
                lineHeight: 0.9,
                letterSpacing: "-0.005em",
              }}
            >
              {style.tag}
              <span className={booking.status === "agendado" ? "" : "opacity-90"}>.</span>
            </div>
            <div className="mt-3 font-mono text-[11px] tracking-wider opacity-80">
              Mandado {dateTime(booking.created_at)}
              {booking.quoted_at && (
                <>
                  {" "}· Cotizado {dateTime(booking.quoted_at)}
                </>
              )}
              {booking.agendado_at && (
                <>
                  {" "}· Agendado {dateTime(booking.agendado_at)}
                </>
              )}
            </div>
          </div>

          {/* DJ contactado */}
          <div className="border-2 border-border bg-bg-panel p-5 mb-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange mb-2">
              — DJ CONTACTADO
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h2
                className="leading-none"
                style={{
                  fontFamily:
                    "var(--font-anton), Impact, system-ui, sans-serif",
                  fontSize: "30px",
                }}
              >
                {booking.dj_artist_name}
                <span className="text-orange">.</span>
              </h2>
              {booking.dj_public_slug && (
                <Link
                  href={`/p/${booking.dj_public_slug}`}
                  className="font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-2 border-2 border-border hover:bg-orange transition-colors"
                >
                  Ver press kit →
                </Link>
              )}
            </div>
          </div>

          {/* Detalles del request */}
          <div className="border-2 border-border bg-bg-panel p-5 mb-4 space-y-3">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange">
              — DETALLES DEL REQUEST
            </div>
            <DetailRow label="A nombre de" value={booking.name} />
            <DetailRow label="Tipo de evento" value={booking.event_type || "—"} />
            <DetailRow
              label="Fecha del evento"
              value={booking.event_date ? shortDate(booking.event_date) : "Sin definir"}
            />
            <DetailRow label="Venue / lugar" value={booking.venue || "—"} />
            {booking.email && <DetailRow label="Email" value={booking.email} />}
            {booking.phone && <DetailRow label="Teléfono" value={booking.phone} />}
            {booking.message && (
              <div className="pt-3 border-t border-border/10">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle mb-1">
                  Mensaje
                </div>
                <p className="text-sm leading-relaxed text-fg whitespace-pre-line">
                  {booking.message}
                </p>
              </div>
            )}
          </div>

          {/* Cotización destacada si aplica */}
          {booking.quoted_amount_clp && booking.quoted_amount_clp > 0 && (
            <div className="border-2 border-warning bg-warning/10 p-5 mb-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-warning mb-1">
                — MONTO COTIZADO POR EL DJ
              </div>
              <div
                style={{
                  fontFamily:
                    "var(--font-anton), Impact, system-ui, sans-serif",
                  fontSize: "40px",
                  lineHeight: 0.9,
                }}
                className="text-fg"
              >
                ${booking.quoted_amount_clp.toLocaleString("es-CL")} CLP
              </div>
            </div>
          )}

          {/* Counteroffer del booker si ya la mandó */}
          {booking.status === "contraofertado" && (
            <div className="border-2 border-border bg-ink text-white p-5 mb-4">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange mb-1">
                — TU CONTRAOFERTA
              </div>
              <div className="space-y-1 mt-2">
                {booking.counter_amount_clp && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-white/60">
                      Monto:{" "}
                    </span>
                    <span
                      style={{
                        fontFamily:
                          "var(--font-anton), Impact, system-ui, sans-serif",
                        fontSize: "24px",
                      }}
                    >
                      ${booking.counter_amount_clp.toLocaleString("es-CL")} CLP
                    </span>
                  </div>
                )}
                {booking.counter_event_date && (
                  <div className="font-mono text-sm">
                    Nueva fecha:{" "}
                    <span className="text-orange">
                      {shortDate(booking.counter_event_date)}
                    </span>
                  </div>
                )}
                {booking.counter_message && (
                  <p className="text-sm mt-2 whitespace-pre-line">
                    “{booking.counter_message}”
                  </p>
                )}
              </div>
              <div className="font-mono text-[10px] text-white/60 mt-3 uppercase tracking-wider">
                Esperando respuesta del DJ
              </div>
            </div>
          )}

          {/* Form de counteroffer (solo si DJ ya cotizó y no se mandó counter) */}
          {booking.status === "cotizado" && (
            <div className="mb-4">
              <CounterofferForm
                token={token}
                quotedAmountClp={booking.quoted_amount_clp}
                originalDate={booking.event_date}
              />
            </div>
          )}

          {/* Timeline siempre visible (debajo del form/counter, arriba de los CTAs) */}
          <div className="mb-4">
            <BookingTimeline booking={booking} perspective="booker" />
          </div>

          {/* CTAs según contexto */}
          <div className="mt-6 flex flex-wrap gap-3">
            {isAnon && (
              <>
                <Link
                  href={`/signup/booker?next=${encodeURIComponent(`/b/${token}`)}`}
                  className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-ink text-white font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-border hover:bg-orange hover:text-ink hover:border-orange transition-colors"
                >
                  Crear cuenta gratis
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-cream text-fg font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-border hover:bg-orange transition-colors"
                >
                  Ya tengo cuenta
                </Link>
              </>
            )}
            {isOwner && (
              <Link
                href="/booker/requests"
                className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-5 py-3 bg-orange text-ink font-mono text-[11px] font-bold tracking-[0.14em] uppercase border-2 border-orange hover:bg-ink hover:text-white transition-colors"
              >
                Ver todos mis requests →
              </Link>
            )}
          </div>

          {/* Disclaimer si anon */}
          {isAnon && (
            <p className="mt-6 font-mono text-[10px] tracking-wider text-fg-subtle leading-relaxed">
              Cualquiera con este link puede ver el estado de tu request.
              Si quieres cerrarlo, crea cuenta y maneja todos tus requests
              desde un lugar seguro.
            </p>
          )}
        </div>
      </div>

      <footer className="bg-ink text-white border-t-2 border-orange py-3 px-6 text-center">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-fg-subtle">
          DROP<span className="text-orange">.</span> · BOOKING SYSTEM · v0.13
        </div>
      </footer>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 text-sm">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-subtle pt-1">
        {label}
      </div>
      <div className="text-fg break-words">{value}</div>
    </div>
  );
}
