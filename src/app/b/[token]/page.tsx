import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getBookingByViewToken } from "@/lib/queries/presskit";
import { createClient } from "@/lib/supabase/server";
import { BookingTimeline } from "@/components/booking/booking-timeline";
import { CounterofferForm } from "./counteroffer-form";
import { dateTime, shortDate } from "@/lib/format";
import { GlassPanel, MonoLabel } from "@/components/hos";
import { Button } from "@/components/ui/button";

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

/**
 * Tono por estado (re-vestido al lenguaje glass Hybrid OS): mantenemos las
 * 7 claves de estado + su `tag`; el color se expresa como acento translúcido
 * sobre glass en vez de una superficie brutalista sólida.
 */
const STATUS_STYLES: Record<string, { accent: string; tag: string }> = {
  nuevo: { accent: "var(--drop-orange)", tag: "Pendiente de revisión" },
  leido: { accent: "var(--drop-info)", tag: "Leído por el DJ" },
  respondido: { accent: "255 255 255", tag: "Respondido" },
  cotizado: { accent: "var(--drop-warning)", tag: "Cotizado" },
  contraofertado: { accent: "var(--drop-info)", tag: "Contraoferta enviada" },
  agendado: { accent: "var(--drop-success)", tag: "Agendado ✓" },
  rechazado: { accent: "var(--drop-danger)", tag: "No disponible" },
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
    <main className="relative min-h-screen overflow-hidden bg-bg text-fg flex flex-col">
      {/* Ambiente radial (firma Hybrid OS, como el resto de Público) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 55% at 50% -10%, rgb(var(--drop-orange) / 0.10), transparent 60%)",
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 py-4 px-6 flex items-center justify-between">
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

      <div className="relative z-10 flex-1 px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          {/* Status hero */}
          <GlassPanel padded={false} className="mb-6">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(120% 90% at 0% 0%, rgb(${style.accent} / 0.16), transparent 62%)`,
              }}
            />
            <div className="relative p-6 md:p-8">
              <div
                className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] mb-2"
                style={{ color: `rgb(${style.accent})` }}
              >
                — ESTADO DEL REQUEST
              </div>
              <div
                style={{
                  fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
                  fontSize: "44px",
                  lineHeight: 0.9,
                  letterSpacing: "-0.005em",
                  color: `rgb(${style.accent})`,
                }}
              >
                {style.tag}
                <span className={booking.status === "agendado" ? "" : "opacity-90"}>.</span>
              </div>
              <div className="mt-3 font-mono text-[11px] tracking-wider text-fg-muted">
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
          </GlassPanel>

          {/* DJ contactado */}
          <GlassPanel className="mb-4">
            <div className="mb-2">
              <MonoLabel>DJ CONTACTADO</MonoLabel>
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
                  className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wider transition-colors hover:border-orange/50 hover:text-orange"
                >
                  Ver press kit →
                </Link>
              )}
            </div>
          </GlassPanel>

          {/* Detalles del request */}
          <GlassPanel className="mb-4">
            <div className="space-y-3">
              <MonoLabel>DETALLES DEL REQUEST</MonoLabel>
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
                <div className="pt-3 border-t border-white/10">
                  <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-fg-subtle mb-1">
                    Mensaje
                  </div>
                  <p className="text-sm leading-relaxed text-fg whitespace-pre-line">
                    {booking.message}
                  </p>
                </div>
              )}
            </div>
          </GlassPanel>

          {/* Cotización destacada si aplica */}
          {booking.quoted_amount_clp && booking.quoted_amount_clp > 0 && (
            <GlassPanel className="mb-4">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-warning/10"
              />
              <div className="relative">
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
            </GlassPanel>
          )}

          {/* Counteroffer del booker si ya la mandó */}
          {booking.status === "contraofertado" && (
            <GlassPanel className="mb-4">
              <div className="mb-1">
                <MonoLabel>TU CONTRAOFERTA</MonoLabel>
              </div>
              <div className="space-y-1 mt-2">
                {booking.counter_amount_clp && (
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
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
                  <p className="text-sm mt-2 whitespace-pre-line text-fg">
                    “{booking.counter_message}”
                  </p>
                )}
              </div>
              <div className="font-mono text-[10px] text-fg-muted mt-3 uppercase tracking-wider">
                Esperando respuesta del DJ
              </div>
            </GlassPanel>
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
                <Button
                  asChild
                  variant="clayPrimary"
                  size="lg"
                  className="flex-1 min-w-[200px]"
                >
                  <Link
                    href={`/signup/booker?next=${encodeURIComponent(`/b/${token}`)}`}
                  >
                    Crear cuenta gratis
                  </Link>
                </Button>
                <Button asChild variant="clay" size="lg">
                  <Link href="/login">Ya tengo cuenta</Link>
                </Button>
              </>
            )}
            {isOwner && (
              <Button
                asChild
                variant="clayPrimary"
                size="lg"
                className="flex-1 min-w-[200px]"
              >
                <Link href="/booker/requests">Ver todos mis requests →</Link>
              </Button>
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

      <footer className="relative z-10 border-t border-white/10 py-3 px-6 text-center">
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
