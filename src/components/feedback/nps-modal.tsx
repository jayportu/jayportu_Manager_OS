"use client";

/**
 * Sprint 23.5 — Modal NPS día 7 / día 15.
 *
 * Se monta condicionalmente desde el layout (app) cuando el usuario beta
 * está en un hito (day_7, day_15) y aún no respondió. El user puede
 * responder, saltarse (se vuelve a mostrar mañana) o cerrar (mismo efecto).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { NpsMilestone } from "@/types/database";

interface Props {
  milestone: NpsMilestone;
  totalDays?: number;
}

export function NpsModal({ milestone, totalDays = 15 }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skipped, setSkipped] = useState(false);

  if (!open || skipped) return null;

  const dayLabel =
    milestone === "day_7" ? `DÍA 7 DE ${totalDays}` : `DÍA ${totalDays} DE ${totalDays}`;

  async function handleSubmit() {
    if (score === null) {
      setError("Elige un número del 0 al 10.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestone, score, comment: comment.trim() }),
      });
      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (data.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    // Marca como saltado en sessionStorage para no mostrar de nuevo en esta sesión
    try {
      sessionStorage.setItem(`drop_nps_skip_${milestone}`, "1");
    } catch {
      // ignorar
    }
    setSkipped(true);
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/70 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-cream border-[3px] border-border p-6"
        style={{ boxShadow: "10px 10px 0 0 #0A0A0A" }}
      >
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — {dayLabel} · BETA
        </div>
        <h2 className="font-display text-3xl md:text-4xl leading-none mt-2">
          ¿RECOMENDARÍAS DROP<span className="text-orange">.</span>
        </h2>
        <p className="text-sm leading-relaxed mt-3">
          A otros DJs, del 0 al 10. Sin filtro. Esto nos ayuda
          a saber si vamos bien.
        </p>

        {/* Escala 0-10 */}
        <div className="grid grid-cols-11 gap-1 mt-5">
          {Array.from({ length: 11 }).map((_, n) => {
            const picked = score === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => {
                  setScore(n);
                  setError(null);
                }}
                className={`border-[1.5px] border-border py-2 font-mono text-sm font-bold transition-colors ${
                  picked ? "bg-orange" : "bg-bg-panel hover:bg-cream"
                }`}
                aria-label={`Score ${n}`}
              >
                {n}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between font-mono text-[10px] text-fg-muted uppercase tracking-wider mt-1">
          <span>Nada probable</span>
          <span>Súper probable</span>
        </div>

        {score !== null && (
          <div className="mt-5 space-y-1">
            <label className="font-mono text-[10px] font-bold uppercase tracking-wider">
              ¿Qué te hace dar un {score}?
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
              placeholder="Lo que más te sirvió, lo que aún no termina de convencerte…"
              className="w-full border-2 border-border bg-bg-panel px-3 py-2 text-sm focus:outline-none focus:border-orange resize-none"
            />
          </div>
        )}

        {error && (
          <div className="text-xs text-danger border-2 border-danger bg-danger/10 p-2 mt-3">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mt-5">
          <button
            type="button"
            onClick={handleSkip}
            disabled={submitting}
            className="font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-2 border-2 border-border/40 text-fg-muted hover:border-border hover:text-fg transition-colors"
          >
            Después
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || score === null}
            className="font-mono text-[11px] font-bold uppercase tracking-wider px-4 py-2 border-2 border-border bg-orange text-ink hover:bg-ink hover:text-orange transition-colors disabled:opacity-50"
          >
            {submitting ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </div>
    </div>
  );
}
