"use client";

/**
 * Sprint 23.5 — Widget feedback flotante.
 *
 * Botón naranja persistente en esquina inferior derecha. Al click abre
 * un modal con tipo (bug/idea/copy/otro), descripción, screenshot opcional
 * (compresión simple a JPEG 800kb max). Auto-captura URL + user-agent.
 */

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  FEEDBACK_KINDS,
  FEEDBACK_KIND_LABELS,
  type FeedbackKind,
} from "@/types/database";
import { MessageSquare, X, Send, Check } from "lucide-react";

export function FeedbackWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [description, setDescription] = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { ok: true } | { ok: false; error: string } | null
  >(null);

  // Reset cuando se cierra
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setKind("bug");
        setDescription("");
        setScreenshot(null);
        setScreenshotName("");
        setResult(null);
      }, 300);
    }
  }, [open]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setResult({ ok: false, error: "Imagen muy grande (max 5MB)." });
      return;
    }
    setScreenshotName(file.name);
    // Convertir a data URL comprimida vía canvas
    try {
      const dataUrl = await compressImage(file, 1200, 0.75);
      setScreenshot(dataUrl);
    } catch {
      setResult({ ok: false, error: "No se pudo procesar la imagen." });
    }
  }

  async function handleSubmit() {
    if (!description.trim()) {
      setResult({ ok: false, error: "Escribe una descripción primero." });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          description: description.trim(),
          page_url: pathname,
          user_agent: navigator.userAgent,
          screenshot_data_url: screenshot,
        }),
      });
      const data = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (data.ok) {
        setResult({ ok: true });
        setTimeout(() => setOpen(false), 1800);
      } else {
        setResult({ ok: false, error: data.error });
      }
    } catch {
      setResult({ ok: false, error: "Error de red." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Enviar feedback"
          className="fixed right-4 bottom-24 md:bottom-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 bg-orange text-ink border-2 border-border font-mono text-[11px] font-bold uppercase tracking-wider shadow-[4px_4px_0_0_var(--ink,#0A0A0A)] hover:translate-y-[-1px] transition-transform"
          style={{ boxShadow: "4px 4px 0 0 #0A0A0A" }}
        >
          <MessageSquare className="w-4 h-4" />
          Feedback
        </button>
      )}

      {open && (
        <div
          className="fixed right-4 bottom-24 md:bottom-4 z-50 w-[min(360px,calc(100vw-32px))] bg-bg-panel border-[3px] border-border"
          style={{ boxShadow: "8px 8px 0 0 #0A0A0A" }}
        >
          <div className="flex items-center justify-between border-b-2 border-border px-4 py-2.5">
            <div className="font-display text-2xl leading-none">
              Feedback<span className="text-orange">.</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="w-7 h-7 flex items-center justify-center hover:bg-ink hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {result?.ok ? (
            <div className="p-6 text-center">
              <Check className="w-10 h-10 text-success mx-auto mb-3" />
              <div className="font-display text-2xl leading-none">
                ENVIADO<span className="text-orange">.</span>
              </div>
              <p className="text-sm text-fg-muted mt-2">
                Gracias. Lo reviso pronto.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {/* Tipo */}
              <div className="grid grid-cols-4 gap-1">
                {FEEDBACK_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-2 border-2 border-border transition-colors ${
                      kind === k ? "bg-orange" : "bg-bg-panel hover:bg-cream"
                    }`}
                  >
                    {FEEDBACK_KIND_LABELS[k]}
                  </button>
                ))}
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  ¿Qué pasa?
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  placeholder={
                    kind === "bug"
                      ? "Al apretar X me lleva a Y, debería ir a Z…"
                      : kind === "idea"
                      ? "Me ayudaría tener…"
                      : "Tu observación…"
                  }
                  className="w-full border-2 border-border bg-bg-panel px-2.5 py-1.5 text-sm focus:outline-none focus:border-orange resize-none"
                />
                <div className="text-[10px] text-fg-subtle text-right font-mono">
                  {description.length}/2000
                </div>
              </div>

              {/* Screenshot */}
              <div className="space-y-1">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider">
                  Screenshot (opcional)
                </label>
                {screenshot ? (
                  <div className="border-2 border-border p-2 flex items-center gap-2">
                    <div className="flex-1 min-w-0 text-xs truncate">
                      {screenshotName} · listo
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshot(null);
                        setScreenshotName("");
                      }}
                      className="text-xs text-danger underline"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFile}
                    className="w-full text-xs"
                  />
                )}
              </div>

              {/* Metadata auto */}
              <div className="font-mono text-[10px] text-fg-subtle border-t border-border/15 pt-2">
                URL: {pathname}
              </div>

              {result && !result.ok && (
                <div className="text-xs text-danger border-2 border-danger bg-danger/10 p-2">
                  {result.error}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !description.trim()}
                className="w-full inline-flex items-center justify-center gap-2 h-10 bg-orange text-ink border-2 border-border font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-ink hover:text-orange transition-colors"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Enviando…" : "Enviar"}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Comprime una imagen a un data URL JPEG con max width = maxW y calidad q.
 * Mantiene el ratio. Tamaño final típicamente < 200kb para screenshots web.
 */
async function compressImage(
  file: File,
  maxW: number,
  q: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = img.height / img.width;
        const w = Math.min(img.width, maxW);
        const h = Math.round(w * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no ctx"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", q));
      };
      img.onerror = () => reject(new Error("invalid image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("read fail"));
    reader.readAsDataURL(file);
  });
}
