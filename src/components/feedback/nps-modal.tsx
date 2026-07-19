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
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md">
        <GlassPanel padded={false}>
          <div className="p-6">
            <MonoLabel className="tracking-[0.12em]">{dayLabel} · BETA</MonoLabel>
            <h2 className="font-display text-3xl md:text-4xl leading-none mt-2 text-white">
              ¿RECOMENDARÍAS DROP<span className="text-orange">.</span>
            </h2>
            <p className="text-sm leading-relaxed mt-3 text-white/70">
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
                    className={cn(
                      "rounded-lg border py-2 font-mono text-sm font-bold transition-colors",
                      picked
                        ? "border-transparent bg-[rgb(var(--drop-orange))] text-ink"
                        : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10",
                    )}
                    aria-label={`Score ${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between font-mono text-[10px] text-white/50 uppercase tracking-wider mt-1">
              <span>Nada probable</span>
              <span>Súper probable</span>
            </div>

            {score !== null && (
              <div className="mt-5 space-y-1">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/60">
                  ¿Qué te hace dar un {score}?
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Lo que más te sirvió, lo que aún no termina de convencerte…"
                  className={cn(FIELD, "resize-none")}
                />
              </div>
            )}

            {error && (
              <div className="mt-3">
                <Alert tone="danger">{error}</Alert>
              </div>
            )}

            <div className="flex justify-between items-center mt-5">
              <Button
                type="button"
                variant="clay"
                onClick={handleSkip}
                disabled={submitting}
              >
                Después
              </Button>
              <Button
                type="button"
                variant="clayPrimary"
                onClick={handleSubmit}
                disabled={submitting || score === null}
              >
                {submitting ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
