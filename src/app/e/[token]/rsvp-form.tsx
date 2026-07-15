"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { GlassPanel, MonoLabel, Alert, ClayChipButton, FIELD } from "@/components/hos";
import { Button } from "@/components/ui/button";

interface Props {
  token: string;
  djArtistName: string;
  initialCount: number;
}

export function RsvpForm({ token, djArtistName, initialCount }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"going" | "maybe">("going");
  const [notify, setNotify] = useState(true);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Déjanos tu email.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/event-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, email, status, notifyFuture: notify }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        going_count?: number;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "No se pudo registrar. Intenta de nuevo.");
        setLoading(false);
        return;
      }
      if (typeof data.going_count === "number") setCount(data.going_count);
      setDone(true);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <GlassPanel className="text-center">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-orange/10"
        />
        <div className="relative">
          <Check className="w-8 h-8 mx-auto text-orange mb-2" strokeWidth={2.5} />
          <div className="font-display text-2xl leading-none">
            {status === "going" ? "¡Nos vemos ahí!" : "¡Anotado como quizás!"}
          </div>
          <p className="text-sm text-fg-muted mt-2">
            {notify
              ? `Te avisaremos cuando ${djArtistName} anuncie su próximo show.`
              : "Listo, tu RSVP quedó registrado."}
          </p>
          <div className="font-mono text-[11px] uppercase tracking-wider mt-3 text-fg-subtle">
            {count} {count === 1 ? "persona va" : "personas van"}
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel>
      <form onSubmit={submit} className="space-y-3">
        <MonoLabel>¿Vas?</MonoLabel>

        <div className="flex gap-2">
          {(["going", "maybe"] as const).map((s) => (
            <ClayChipButton
              key={s}
              active={status === s}
              onClick={() => setStatus(s)}
              className="flex-1 justify-center"
            >
              {s === "going" ? "Voy" : "Quizás"}
            </ClayChipButton>
          ))}
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className={FIELD}
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          className={FIELD}
        />

        <label className="flex items-start gap-2 text-[12px] text-fg-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-orange"
          />
          <span>Avísame cuando {djArtistName} anuncie su próximo show.</span>
        </label>

        {error && <Alert tone="danger">{error}</Alert>}

        <Button
          type="submit"
          variant="clayPrimary"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Registrando…" : "Confirmar RSVP"}
        </Button>
      </form>
    </GlassPanel>
  );
}
