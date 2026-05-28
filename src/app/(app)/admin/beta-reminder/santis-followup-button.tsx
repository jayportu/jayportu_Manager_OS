"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { sendSantisTechRiderFollowupAction } from "./actions";

type Result =
  | { ok: true; emailId: string; email: string }
  | { ok: false; error: string };

export function SantisFollowupButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  function handleSend() {
    if (
      !confirm(
        "¿Mandar el email a SANTIS agradeciéndole por el bug y pidiéndole que pruebe?"
      )
    )
      return;
    setResult(null);
    startTransition(async () => {
      const res = await sendSantisTechRiderFollowupAction();
      setResult(res);
    });
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleSend}
        disabled={isPending}
      >
        <Send className="w-4 h-4 mr-2" />
        {isPending ? "Enviando…" : "Avisar a SANTIS del fix de tech rider"}
      </Button>

      {result && !result.ok && (
        <div className="border-2 border-danger bg-danger/10 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-danger">Error</div>
            <div className="text-fg">{result.error}</div>
          </div>
        </div>
      )}

      {result && result.ok && (
        <div className="border-2 border-ink bg-cream p-3 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Enviado a {result.email}</div>
            <div className="font-mono text-[11px] text-fg-subtle mt-0.5">
              {result.emailId}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
