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
  const confirmCls = danger
    ? "bg-danger text-white border-danger"
    : warn
      ? "bg-warning text-ink border-warning"
      : "bg-orange text-ink border-ink";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/50 p-4"
          onClick={onCancel}
        >
          <div
            className={`w-full max-w-md bg-bg-panel border-[3px] ${
              danger ? "border-danger" : "border-ink"
            } p-5`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className={`font-display text-2xl leading-none ${
                danger ? "text-danger" : "text-ink"
              }`}
            >
              {opts.title}
            </h2>
            {opts.message && (
              <div className="text-sm text-fg-muted mt-2.5 leading-relaxed">
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
                className="mt-3 w-full border-2 border-ink bg-bg-panel px-3 py-2 text-sm focus:outline-none focus:border-orange resize-y"
              />
            )}

            {opts.typeToConfirm && (
              <div className="mt-3">
                <label className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-subtle block mb-1.5">
                  Escribe {opts.typeToConfirm} para confirmar
                </label>
                <input
                  autoFocus
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={opts.typeToConfirm}
                  className="w-full border-2 border-ink bg-bg-panel px-3 py-2 font-mono text-sm focus:outline-none focus:border-danger"
                />
              </div>
            )}

            {err && <div className="text-[12px] text-danger mt-2">{err}</div>}

            <div className="flex justify-end gap-2 mt-4">
              {!opts.hideCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3.5 py-2 border-2 border-ink bg-bg-panel hover:bg-cream transition-colors"
                >
                  {opts.cancelLabel || "Cancelar"}
                </button>
              )}
              <button
                type="button"
                onClick={onConfirm}
                disabled={!matchOk}
                className={`font-mono text-[11px] font-bold uppercase tracking-[0.08em] px-3.5 py-2 border-2 transition-opacity ${confirmCls} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {opts.confirmLabel || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
