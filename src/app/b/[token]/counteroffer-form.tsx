"use client";

/**
 * Bloque C · C2 — Form de contraoferta para el Booker.
 *
 * Aparece en /b/[token] cuando booking.status == 'cotizado'.
 * Al submit, llama submitCounterofferAction y refresca la página.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitCounterofferAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";

interface Props {
  token: string;
  /** Monto que el DJ ya cotizó, para precargar el input opcionalmente. */
  quotedAmountClp: number | null;
  /** Fecha del evento original, para precargar. */
  originalDate: string | null;
}

export function CounterofferForm({
  token,
  quotedAmountClp,
  originalDate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [eventDate, setEventDate] = useState(originalDate ?? "");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const numAmount = amount
      ? parseInt(amount.replace(/\D/g, ""), 10)
      : null;
    startTransition(async () => {
      const r = await submitCounterofferAction({
        token,
        amount: numAmount && !isNaN(numAmount) ? numAmount : null,
        eventDate: eventDate || null,
        message: message.trim(),
      });
      if (!r.ok) {
        setError(r.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <GlassPanel>
        <div className="mb-2">
          <MonoLabel>¿NO TE CIERRA ESTE MONTO?</MonoLabel>
        </div>
        <p className="text-sm text-fg mb-4 leading-relaxed">
          Puedes mandar una contraoferta con un monto distinto, otra fecha
          o un mensaje. El DJ la va a ver en su dashboard y decide si la
          acepta, la rebate o re-cotiza.
        </p>
        <Button
          type="button"
          variant="clay"
          size="sm"
          onClick={() => setOpen(true)}
        >
          Contraofertar →
        </Button>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <MonoLabel>MANDAR CONTRAOFERTA</MonoLabel>
          <p className="text-xs text-fg-muted mt-1">
            Llena al menos uno: monto, fecha o mensaje.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="counter-amount">Tu propuesta (CLP)</Label>
            <Input
              id="counter-amount"
              type="text"
              placeholder={
                quotedAmountClp
                  ? `Cotizado: $${quotedAmountClp.toLocaleString("es-CL")}`
                  : "$ 350.000"
              }
              value={amount}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setAmount(v ? `$${parseInt(v, 10).toLocaleString("es-CL")}` : "");
              }}
              inputMode="numeric"
              className={FIELD}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="counter-date">¿Otra fecha?</Label>
            <Input
              id="counter-date"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="counter-msg">Mensaje (opcional)</Label>
          <Textarea
            id="counter-msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="Ej: el presupuesto cierra a $X. ¿Podemos cerrar el viernes en lugar del sábado?"
            maxLength={500}
            className={FIELD}
          />
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            type="button"
            variant="clay"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="clayPrimary" size="sm" disabled={pending}>
            {pending ? "Enviando…" : "Mandar contraoferta"}
          </Button>
        </div>
      </form>
    </GlassPanel>
  );
}
