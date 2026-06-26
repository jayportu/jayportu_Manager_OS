"use client";

import { useState } from "react";
import { Check } from "lucide-react";

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
      <div className="border-2 border-ink bg-orange p-6 text-center">
        <Check className="w-8 h-8 mx-auto text-ink mb-2" strokeWidth={2.5} />
        <div className="font-display text-2xl leading-none">
          {status === "going" ? "¡Nos vemos ahí!" : "¡Anotado como quizás!"}
        </div>
        <p className="text-sm text-ink/80 mt-2">
          {notify
            ? `Te avisaremos cuando ${djArtistName} anuncie su próximo show.`
            : "Listo, tu RSVP quedó registrado."}
        </p>
        <div className="font-mono text-[11px] uppercase tracking-wider mt-3 text-ink/70">
          {count} {count === 1 ? "persona va" : "personas van"}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="border-2 border-ink bg-bg-panel p-5 space-y-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
        — ¿Vas?
      </div>

      <div className="flex gap-2">
        {(["going", "maybe"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 border-2 border-ink py-2 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors ${
              status === s ? "bg-ink text-orange" : "bg-bg-panel text-ink hover:bg-cream"
            }`}
          >
            {s === "going" ? "Voy" : "Quizás"}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
        className="w-full border-2 border-ink bg-bg-panel px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:border-orange"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        required
        className="w-full border-2 border-ink bg-bg-panel px-3 py-2 text-sm placeholder:text-fg-subtle focus:outline-none focus:border-orange"
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

      {error && <div className="text-sm text-danger">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="w-full border-2 border-ink bg-orange text-ink py-2.5 font-mono text-[12px] font-bold uppercase tracking-[0.1em] hover:bg-ink hover:text-orange transition-colors disabled:opacity-50"
      >
        {loading ? "Registrando…" : "Confirmar RSVP"}
      </button>
    </form>
  );
}
