"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassPanel, MonoLabel, Alert } from "@/components/hos";
import { INK } from "@/components/hos/tokens";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/types/database";
import {
  updateBookingWorkflowAction,
  convertBookingToContactAction,
} from "../../actions";

interface Props {
  id: string;
  status: BookingStatus;
  contactId: string | null;
  quotedAmountClp: number | null;
  notesInternal: string;
  eventDate: string | null;
  hasFollowUp: boolean;
  hasCalendarEvent: boolean;
}

type BadgeTone = "up" | "warn" | "down" | "info" | "neutral";

/* Los 7 estados del workflow, en orden, con su tono de Badge. */
const STATUS_FLOW: { key: BookingStatus; tone: BadgeTone }[] = [
  { key: "nuevo", tone: "info" },
  { key: "leido", tone: "neutral" },
  { key: "respondido", tone: "neutral" },
  { key: "cotizado", tone: "warn" },
  { key: "contraofertado", tone: "warn" },
  { key: "agendado", tone: "up" },
  { key: "rechazado", tone: "down" },
];

const TONE_COLOR: Record<BadgeTone, string> = {
  up: "rgb(var(--drop-success))",
  warn: "rgb(var(--drop-warning))",
  down: "rgb(var(--drop-danger))",
  info: "rgb(var(--drop-info))",
  neutral: "rgba(255,255,255,.5)",
};

export function BookingActions({
  id,
  status,
  contactId,
  quotedAmountClp,
  notesInternal,
  eventDate,
  hasFollowUp,
  hasCalendarEvent,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showQuote, setShowQuote] = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);

  const [amountClp, setAmountClp] = useState(
    quotedAmountClp ? `$${quotedAmountClp.toLocaleString("es-CL")}` : ""
  );
  const [notesValue, setNotesValue] = useState(notesInternal);
  const [eventDateValue, setEventDateValue] = useState(eventDate ?? "");

  function handleSimpleStatus(newStatus: BookingStatus) {
    if (newStatus === status) return;
    setError(null);
    startTransition(async () => {
      // Vía workflow (no el UPDATE plano): así las transiciones disparan las
      // auto-acciones (promover a contacto, follow-up al cotizar, evento al
      // agendar si hay fecha) en vez de solo cambiar el campo status.
      const r = await updateBookingWorkflowAction(id, { status: newStatus });
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function handleQuote() {
    setError(null);
    const amount = amountClp
      ? parseInt(amountClp.replace(/\D/g, ""), 10)
      : null;
    startTransition(async () => {
      const r = await updateBookingWorkflowAction(id, {
        status: "cotizado",
        quoted_amount_clp: amount && !isNaN(amount) ? amount : null,
        notes_internal: notesValue,
      });
      if (!r.ok) setError(r.error);
      else {
        setShowQuote(false);
        router.refresh();
      }
    });
  }

  function handleAgendar() {
    setError(null);
    if (!eventDateValue) {
      setError("La fecha del evento es obligatoria para agendar.");
      return;
    }
    const amount = amountClp
      ? parseInt(amountClp.replace(/\D/g, ""), 10)
      : null;
    startTransition(async () => {
      const r = await updateBookingWorkflowAction(id, {
        status: "agendado",
        quoted_amount_clp: amount && !isNaN(amount) ? amount : null,
        notes_internal: notesValue,
        event_date: eventDateValue,
      });
      if (!r.ok) setError(r.error);
      else {
        setShowAgenda(false);
        router.refresh();
      }
    });
  }

  function handleConvert() {
    setError(null);
    startTransition(async () => {
      const result = await convertBookingToContactAction(id);
      if (result.ok) {
        router.push(`/crm/${result.data.contact_id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <GlassPanel>
      <div className="space-y-4">
        <div>
          <MonoLabel className="mb-3 block">Estado actual</MonoLabel>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FLOW.map((s) => {
              const active = status === s.key;
              const c = TONE_COLOR[s.tone];
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSimpleStatus(s.key)}
                  disabled={isPending}
                  aria-pressed={active}
                  className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] transition-transform active:translate-y-px disabled:opacity-50 disabled:pointer-events-none"
                  style={
                    active
                      ? { background: c, color: INK }
                      : {
                          border: `1px solid ${c}`,
                          color: c,
                          background: "rgba(255,255,255,.03)",
                        }
                  }
                >
                  {BOOKING_STATUS_LABELS[s.key]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workflow auto · COTIZAR */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/80">
                ⏱ COTIZAR
              </div>
              <p className="text-xs text-white/50 mt-1">
                Pasa a &ldquo;cotizado&rdquo;, registra el monto y DROP crea un
                follow-up auto para +3 días.
              </p>
            </div>
            {!showQuote && !showAgenda && (
              <Button
                type="button"
                variant="clayPrimary"
                size="sm"
                onClick={() => setShowQuote(true)}
                disabled={isPending}
              >
                Cotizar →
              </Button>
            )}
          </div>
          {showQuote && (
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount-q" className="text-[10px]">
                  Monto cotizado (CLP)
                </Label>
                <Input
                  id="amount-q"
                  value={amountClp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setAmountClp(
                      v ? `$${parseInt(v, 10).toLocaleString("es-CL")}` : ""
                    );
                  }}
                  placeholder="$480.000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes-q" className="text-[10px]">
                  Notas internas
                </Label>
                <Textarea
                  id="notes-q"
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  rows={2}
                  placeholder="Ej: pasé propuesta con rider, esperando respuesta del manager."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowQuote(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="clayPrimary"
                  size="sm"
                  onClick={handleQuote}
                  disabled={isPending}
                >
                  {isPending ? "Procesando…" : "Cotizar + crear follow-up"}
                </Button>
              </div>
            </div>
          )}
          {hasFollowUp && status === "cotizado" && (
            <div className="mt-3 font-mono text-[10px] text-success">
              ✓ Follow-up auto creado (en /dashboard)
            </div>
          )}
        </div>

        {/* Workflow auto · AGENDAR */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/80">
                ✓ AGENDAR
              </div>
              <p className="text-xs text-white/50 mt-1">
                Crea automáticamente el evento en /calendario con el monto y
                payment_status=pending.
              </p>
            </div>
            {!showAgenda && !showQuote && (
              <Button
                type="button"
                variant="clay"
                size="sm"
                onClick={() => setShowAgenda(true)}
                disabled={isPending}
              >
                Agendar →
              </Button>
            )}
          </div>
          {showAgenda && (
            <div className="mt-3 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-date" className="text-[10px]">
                  Fecha del gig *
                </Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventDateValue}
                  onChange={(e) => setEventDateValue(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount-a" className="text-[10px]">
                  Monto pactado (CLP)
                </Label>
                <Input
                  id="amount-a"
                  value={amountClp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setAmountClp(
                      v ? `$${parseInt(v, 10).toLocaleString("es-CL")}` : ""
                    );
                  }}
                  placeholder="$480.000"
                  inputMode="numeric"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAgenda(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="clayPrimary"
                  size="sm"
                  onClick={handleAgendar}
                  disabled={isPending}
                >
                  {isPending ? "Procesando…" : "Agendar + crear evento"}
                </Button>
              </div>
            </div>
          )}
          {hasCalendarEvent && status === "agendado" && (
            <div className="mt-3 font-mono text-[10px] text-success">
              ✓ Evento auto creado en /calendario
            </div>
          )}
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {!contactId && (
          <div className="pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="clay"
              size="sm"
              onClick={handleConvert}
              disabled={isPending}
            >
              {isPending ? "Procesando…" : "Convertir en contacto del CRM"}
            </Button>
            <p className="text-[10px] text-white/40 mt-2">
              Crea un contacto en /crm con los datos del booking.
            </p>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
