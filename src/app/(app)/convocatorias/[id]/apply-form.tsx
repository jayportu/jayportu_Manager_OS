"use client";

import { useState, useTransition } from "react";
import { Send, Check } from "lucide-react";
import { applyToGigAction } from "../actions";
import { GlassPanel, Alert, FIELD } from "@/components/hos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ApplyForm({
  gigId,
  alreadyApplied,
}: {
  gigId: string;
  alreadyApplied: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [availability, setAvailability] = useState("");

  if (alreadyApplied) {
    return <Alert tone="info">Ya postulaste a esta convocatoria.</Alert>;
  }

  if (done) {
    return (
      <GlassPanel className="text-center">
        <Check className="w-10 h-10 text-accent mx-auto mb-3" />
        <h2 className="font-display text-xl">¡Postulación enviada!</h2>
        <p className="text-sm text-white/55 mt-2">
          El organizador recibirá tu mensaje y disponibilidad.
        </p>
      </GlassPanel>
    );
  }

  function submit() {
    if (!message.trim()) {
      setErr("Escribe un mensaje de postulación.");
      return;
    }
    setErr(null);
    startTransition(async () => {
      try {
        const r = await applyToGigAction(gigId, { message, availability });
        if (r.ok) setDone(true);
        else setErr(r.error);
      } catch {
        setErr("Error de red. Intenta de nuevo.");
      }
    });
  }

  return (
    <GlassPanel>
      <div className="flex flex-col gap-3">
        <div>
          <label
            htmlFor="apply-message"
            className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
          >
            Mensaje
          </label>
          <textarea
            id="apply-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Cuéntale al organizador por qué eres la mejor opción para esta fecha…"
            required
            className={cn(FIELD, "resize-none")}
          />
          <div className="text-[10px] text-white/40 text-right font-mono">
            {message.length}/2000
          </div>
        </div>

        <div>
          <label
            htmlFor="apply-availability"
            className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
          >
            Disponibilidad
          </label>
          <input
            id="apply-availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
            maxLength={500}
            placeholder="Ej. Disponible toda la fecha, llego un día antes"
            className={FIELD}
          />
        </div>

        {err && <Alert tone="danger">{err}</Alert>}

        <div>
          <Button
            type="button"
            variant="clayPrimary"
            onClick={submit}
            disabled={pending || !message.trim()}
          >
            <Send className="w-4 h-4" />
            {pending ? "Enviando…" : "Postular"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
