"use client";

import { useState, useTransition } from "react";
import { Send, Check } from "lucide-react";
import { applyToGigAction } from "../actions";

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
    return (
      <div className="border-2 border-border p-4 text-sm text-fg-muted">
        Ya postulaste a esta convocatoria.
      </div>
    );
  }

  if (done) {
    return (
      <div className="border-2 border-border p-8 text-center">
        <Check className="w-10 h-10 text-accent mx-auto mb-3" />
        <h2 className="text-xl font-bold">¡Postulación enviada!</h2>
        <p className="text-sm text-fg-muted mt-2">
          El organizador recibirá tu mensaje y disponibilidad.
        </p>
      </div>
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
    <div className="flex flex-col gap-3 max-w-xl">
      <div>
        <label
          htmlFor="apply-message"
          className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1"
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
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent resize-none"
        />
        <div className="text-[10px] text-fg-muted text-right font-mono">
          {message.length}/2000
        </div>
      </div>

      <div>
        <label
          htmlFor="apply-availability"
          className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1"
        >
          Disponibilidad
        </label>
        <input
          id="apply-availability"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
          maxLength={500}
          placeholder="Ej. Disponible toda la fecha, llego un día antes"
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
      </div>

      {err && (
        <div className="text-xs text-danger border-2 border-danger/40 bg-danger/10 p-2">
          {err}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !message.trim()}
        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
      >
        <Send className="w-4 h-4" />
        {pending ? "Enviando…" : "Postular"}
      </button>
    </div>
  );
}
