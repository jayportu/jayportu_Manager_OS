"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PenSquare, X, Send } from "lucide-react";
import { sendNew } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-1.5 h-9 px-4 border-2 border-ink bg-orange hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send className="w-3.5 h-3.5" /> {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

function ComposeModal({ onClose }: { onClose: () => void }) {
  const [state, action] = useFormState(sendNew, null);
  const ref = useRef<HTMLFormElement>(null);

  // Al enviar OK: limpia y cierra el panel tras un breve "✓ enviado".
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-lg rounded-lg border border-border shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            ▸ Nuevo correo
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-muted hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form ref={ref} action={action} className="p-4 space-y-3">
          <div className="font-mono text-[11px] text-fg-muted">
            De: <span className="text-ink font-semibold">hola@dropgigs.com</span>
          </div>
          <input
            type="email"
            name="to"
            required
            placeholder="Para (correo del destinatario)"
            className="w-full text-sm border border-border rounded-md px-3 py-2 outline-none focus:border-ink bg-transparent"
          />
          <input
            type="text"
            name="subject"
            placeholder="Asunto"
            className="w-full text-sm border border-border rounded-md px-3 py-2 outline-none focus:border-ink bg-transparent"
          />
          <textarea
            name="text"
            required
            rows={9}
            placeholder="Escribe tu mensaje…"
            className="w-full text-sm border border-border rounded-md px-3 py-2 outline-none focus:border-ink resize-y bg-transparent"
          />
          <div className="flex items-center gap-3">
            {state?.ok && (
              <span className="text-sm font-medium" style={{ color: "#1e9e5a" }}>
                ✓ Correo enviado
              </span>
            )}
            {state && !state.ok && (
              <span className="text-sm" style={{ color: "#c0392b" }}>
                {state.error}
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-fg-muted hover:text-ink px-3 py-2"
              >
                Cerrar
              </button>
              <SubmitBtn />
            </div>
          </div>
          <p className="font-mono text-[10px] text-fg-muted">
            Se envía con la firma DROP. y queda en Enviados.
          </p>
        </form>
      </div>
    </div>
  );
}

export function Compose() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-4 border-2 border-ink bg-orange hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
      >
        <PenSquare className="w-3.5 h-3.5" /> Redactar
      </button>
      {open && <ComposeModal onClose={() => setOpen(false)} />}
    </>
  );
}
