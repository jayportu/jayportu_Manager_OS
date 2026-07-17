"use client";

import { useState, useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { PenSquare, X, Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, MonoLabel, FIELD } from "@/components/hos";
import { cn } from "@/lib/utils";
import { sendNew } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="clayPrimary" size="sm" disabled={pending}>
      <Send className="w-3.5 h-3.5" /> {pending ? "Enviando…" : "Enviar"}
    </Button>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="hos-glass w-full max-w-lg overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <MonoLabel>Nuevo correo</MonoLabel>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="text-white/50 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form ref={ref} action={action} className="p-5 space-y-3">
          <div className="font-mono text-[11px] text-white/50">
            De: <span className="text-white font-semibold">hola@dropgigs.com</span>
          </div>
          <input
            type="email"
            name="to"
            required
            aria-label="Para (correo del destinatario)"
            placeholder="Para (correo del destinatario)"
            className={FIELD}
          />
          <input
            type="text"
            name="subject"
            aria-label="Asunto"
            placeholder="Asunto"
            className={FIELD}
          />
          <textarea
            name="text"
            required
            rows={9}
            aria-label="Mensaje"
            placeholder="Escribe tu mensaje…"
            className={cn(FIELD, "resize-y")}
          />
          <label className="flex items-center gap-2 text-xs text-white/50">
            <Paperclip className="w-3.5 h-3.5" />
            <input type="file" name="files" multiple className="text-xs" />
          </label>
          {state?.ok && <Alert tone="success">✓ Correo enviado</Alert>}
          {state && !state.ok && <Alert tone="danger">{state.error}</Alert>}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="clay" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <SubmitBtn />
          </div>
          <p className="font-mono text-[10px] text-white/40">
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
      <Button variant="clayPrimary" size="sm" onClick={() => setOpen(true)}>
        <PenSquare className="w-3.5 h-3.5" /> Redactar
      </Button>
      {open && <ComposeModal onClose={() => setOpen(false)} />}
    </>
  );
}
