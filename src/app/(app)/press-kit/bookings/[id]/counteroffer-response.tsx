"use client";

/**
 * Bloque C · C4 — UI del DJ para responder a una contraoferta del booker.
 *
 * Se renderiza solo cuando booking.status == 'contraofertado'.
 * Muestra la propuesta del booker (monto + fecha + mensaje) y dos
 * acciones:
 *  - Aceptar contraoferta → pasa a 'agendado' usando el counter como
 *    valores definitivos. Crea calendar_event auto.
 *  - Recotizar → vuelve a 'cotizado' con nuevo monto/fecha del DJ.
 *    Limpia counter_* para que el booker pueda contraofertar de nuevo.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { shortDate, dateTime } from "@/lib/format";
import {
  acceptCounterofferAction,
  recounterAction,
} from "../../actions";

interface Props {
  bookingId: string;
  counterAmount: number | null;
  counterDate: string | null;
  counterMessage: string;
  counterAt: string | null;
  originalDate: string | null;
  quotedAmount: number | null;
}

export function CounterofferResponse({
  bookingId,
  counterAmount,
  counterDate,
  counterMessage,
  counterAt,
  originalDate,
  quotedAmount,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRecounter, setShowRecounter] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newDate, setNewDate] = useState(counterDate ?? originalDate ?? "");

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const r = await acceptCounterofferAction(bookingId);
      if (!r.ok) setError(r.error);
      else router.refresh();
    });
  }

  function handleRecounter() {
    setError(null);
    const amount = newAmount
      ? parseInt(newAmount.replace(/\D/g, ""), 10)
      : null;
    if (!amount || amount <= 0) {
      setError("Ingresá un monto válido para la nueva cotización");
      return;
    }
    startTransition(async () => {
      const r = await recounterAction(bookingId, amount, newDate || null);
      if (!r.ok) setError(r.error);
      else {
        setShowRecounter(false);
        router.refresh();
      }
    });
  }

  const finalAmount = counterAmount ?? quotedAmount;
  const finalDate = counterDate ?? originalDate;

  return (
    <Card className="p-5 mb-5 border-2 border-orange bg-orange/5">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange mb-3">
        — CONTRAOFERTA DEL BOOKER
        {counterAt && (
          <span className="ml-2 text-fg-subtle font-normal normal-case tracking-wider">
            · recibida {dateTime(counterAt)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {counterAmount && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
              Nuevo monto propuesto
            </div>
            <div
              style={{
                fontFamily:
                  "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "30px",
                lineHeight: 1,
              }}
              className="text-ink"
            >
              ${counterAmount.toLocaleString("es-CL")} CLP
            </div>
            {quotedAmount && quotedAmount !== counterAmount && (
              <div className="font-mono text-[10px] text-fg-subtle mt-1">
                Cotizado original: ${quotedAmount.toLocaleString("es-CL")} (
                {counterAmount > quotedAmount ? "+" : ""}
                {(((counterAmount - quotedAmount) / quotedAmount) * 100).toFixed(0)}
                %)
              </div>
            )}
          </div>
        )}

        {counterDate && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
              Nueva fecha
            </div>
            <div
              style={{
                fontFamily:
                  "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "26px",
                lineHeight: 1,
              }}
              className="text-ink"
            >
              {shortDate(counterDate)}
            </div>
            {originalDate && (
              <div className="font-mono text-[10px] text-fg-subtle mt-1">
                Original: {shortDate(originalDate)}
              </div>
            )}
          </div>
        )}
      </div>

      {counterMessage && (
        <div className="mb-4 p-3 bg-white border-2 border-ink/20">
          <div className="text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            Mensaje del booker
          </div>
          <p className="text-sm whitespace-pre-line">“{counterMessage}”</p>
        </div>
      )}

      {error && (
        <div className="border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger mb-3">
          {error}
        </div>
      )}

      {/* Acciones */}
      {!showRecounter && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleAccept}
            disabled={pending || !finalDate}
            title={
              !finalDate ? "Falta fecha para agendar" : "Agendar con esta propuesta"
            }
          >
            {pending ? "Procesando…" : "Aceptar contraoferta · Agendar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowRecounter(true)}
            disabled={pending}
          >
            Recotizar →
          </Button>
        </div>
      )}

      {/* Form de recotización */}
      {showRecounter && (
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-orange">
            — TU NUEVA COTIZACIÓN
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recounter-amount">Tu monto</Label>
              <Input
                id="recounter-amount"
                value={newAmount}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  setNewAmount(
                    v ? `$${parseInt(v, 10).toLocaleString("es-CL")}` : ""
                  );
                }}
                placeholder={
                  finalAmount
                    ? `Propuesta: $${finalAmount.toLocaleString("es-CL")}`
                    : "$ 400.000"
                }
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recounter-date">Fecha (opcional)</Label>
              <Input
                id="recounter-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRecounter(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="orange"
              size="sm"
              onClick={handleRecounter}
              disabled={pending}
            >
              {pending ? "Procesando…" : "Mandar recotización"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
