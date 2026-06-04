"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send, Paperclip } from "lucide-react";
import { sendReply } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="ml-auto inline-flex items-center gap-1.5 h-9 px-4 border-2 border-ink bg-orange hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Send className="w-3.5 h-3.5" /> {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function ReplyForm({
  id,
  to,
  subject,
}: {
  id: string;
  to: string;
  subject: string;
}) {
  const [state, action] = useFormState(sendReply, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form
      ref={ref}
      action={action}
      className="border border-border rounded-lg p-3 mt-2"
    >
      <input type="hidden" name="id" defaultValue={id} />
      <input type="hidden" name="to" defaultValue={to} />
      <input type="hidden" name="subject" defaultValue={subject} />
      <div className="font-mono text-[11px] text-fg-muted border-b border-border pb-2 mb-2">
        De: <span className="text-ink font-semibold">hola@dropgigs.com</span> ·
        Para: {to}
      </div>
      <textarea
        name="text"
        required
        rows={4}
        placeholder="Escribe tu respuesta…"
        className="w-full text-sm bg-transparent outline-none resize-y"
      />
      <label className="flex items-center gap-2 text-xs text-fg-muted mt-1">
        <Paperclip className="w-3.5 h-3.5" />
        <input type="file" name="files" multiple className="text-xs" />
      </label>
      <div className="flex items-center gap-3 mt-2">
        {state?.ok && (
          <span className="text-sm font-medium" style={{ color: "#1e9e5a" }}>
            ✓ Respuesta enviada
          </span>
        )}
        {state && !state.ok && (
          <span className="text-sm" style={{ color: "#c0392b" }}>
            {state.error}
          </span>
        )}
        <SubmitButton />
      </div>
    </form>
  );
}
