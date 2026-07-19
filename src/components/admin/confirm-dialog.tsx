"use client";

/**
 * Sistema de confirmación unificado del admin — reemplaza window.confirm/prompt.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const { ok, reason } = await confirm({ title, variant, requireReason });
 *   if (!ok) return;
 *
 * 3 modos:
 *   - simple: solo Cancelar / Confirmar.
 *   - requireReason: muestra textarea, el motivo es obligatorio (queda en historial).
 *   - typeToConfirm: hay que escribir la palabra exacta (ej. "ELIMINAR") para habilitar.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { GlassPanel, FIELD } from "@/components/hos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmVariant = "default" | "warning" | "danger";

export interface ConfirmOptions {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  /** Muestra textarea de motivo (obligatorio). */
  requireReason?: boolean;
  reasonPlaceholder?: string;
  /** Palabra que el admin debe escribir para habilitar el botón (ej. "ELIMINAR"). */
  typeToConfirm?: string;
  /** Modo "aviso": oculta Cancelar y muestra solo el botón de confirmar
   *  (reemplaza window.alert con un modal de marca). */
  hideCancel?: boolean;
}

export interface ConfirmResult {
  ok: boolean;
  reason: string;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<ConfirmResult>;

const ConfirmContext = createContext<ConfirmFn>(async () => ({
  ok: false,
  reason: "",
}));

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const resolver = useRef<((r: ConfirmResult) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    setReason("");
    setTyped("");
    setErr(null);
    return new Promise<ConfirmResult>((res) => {
      resolver.current = res;
    });
  }, []);

  const finish = useCallback((result: ConfirmResult) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  const onCancel = useCallback(() => finish({ ok: false, reason: "" }), [finish]);

  const matchOk = !opts?.typeToConfirm || typed.trim() === opts.typeToConfirm;

  const onConfirm = useCallback(() => {
    if (!opts) return;
    if (opts.requireReason && reason.trim().length === 0) {
      setErr("El motivo es obligatorio.");
      return;
    }
    if (opts.typeToConfirm && typed.trim() !== opts.typeToConfirm) return;
    finish({ ok: true, reason: reason.trim() });
  }, [opts, reason, typed, finish]);

  // Escape cancela
  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [opts, onCancel]);

  const danger = opts?.variant === "danger";
  const warn = opts?.variant === "warning";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <div
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel
              className={cn(
                danger && "ring-1 ring-[rgb(var(--drop-danger))]/45",
              )}
            >
              <h2
                className={cn(
                  "font-display text-2xl leading-none",
                  danger ? "text-danger" : "text-white",
                )}
              >
                {opts.title}
              </h2>
              {opts.message && (
                <div className="text-sm text-white/70 mt-2.5 leading-relaxed">
                  {opts.message}
                </div>
              )}

              {opts.requireReason && (
                <textarea
                  autoFocus
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (err) setErr(null);
                  }}
                  placeholder={opts.reasonPlaceholder || "Motivo (obligatorio)…"}
                  rows={3}
                  maxLength={500}
                  className={cn(FIELD, "mt-3 resize-y")}
                />
              )}

              {opts.typeToConfirm && (
                <div className="mt-3">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/50 block mb-1.5">
                    Escribe {opts.typeToConfirm} para confirmar
                  </label>
                  <input
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    placeholder={opts.typeToConfirm}
                    className={FIELD}
                  />
                </div>
              )}

              {err && <div className="text-[12px] text-danger mt-2">{err}</div>}

              <div className="flex justify-end gap-2 mt-4">
                {!opts.hideCancel && (
                  <Button type="button" variant="clay" onClick={onCancel}>
                    {opts.cancelLabel || "Cancelar"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant={danger || warn ? "clay" : "clayPrimary"}
                  onClick={onConfirm}
                  disabled={!matchOk}
                  className={cn(
                    danger &&
                      "bg-[rgb(var(--drop-danger))] text-ink shadow-[var(--hos-clay-btn)]",
                    warn &&
                      "bg-[rgb(var(--drop-warning))] text-ink shadow-[var(--hos-clay-btn)]",
                  )}
                >
                  {opts.confirmLabel || "Confirmar"}
                </Button>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
