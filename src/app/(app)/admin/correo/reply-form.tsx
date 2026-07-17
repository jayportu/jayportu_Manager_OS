"use client";

import { useEffect, useRef } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, FIELD } from "@/components/hos";
import { cn } from "@/lib/utils";
import { sendReply } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="clayPrimary" size="sm" disabled={pending}>
      <Send className="w-3.5 h-3.5" /> {pending ? "Enviando…" : "Enviar"}
    </Button>
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
      className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <input type="hidden" name="id" defaultValue={id} />
      <input type="hidden" name="to" defaultValue={to} />
      <input type="hidden" name="subject" defaultValue={subject} />
      <div className="font-mono text-[11px] text-white/50 border-b border-white/10 pb-2 mb-3">
        De: <span className="text-white font-semibold">hola@dropgigs.com</span> ·
        Para: {to}
      </div>
      <textarea
        name="text"
        required
        rows={4}
        aria-label="Respuesta"
        placeholder="Escribe tu respuesta…"
        className={cn(FIELD, "resize-y")}
      />
      <label className="flex items-center gap-2 text-xs text-white/50 mt-2">
        <Paperclip className="w-3.5 h-3.5" />
        <input type="file" name="files" multiple className="text-xs" />
      </label>
      {state?.ok && (
        <div className="mt-3">
          <Alert tone="success">✓ Respuesta enviada</Alert>
        </div>
      )}
      {state && !state.ok && (
        <div className="mt-3">
          <Alert tone="danger">{state.error}</Alert>
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
