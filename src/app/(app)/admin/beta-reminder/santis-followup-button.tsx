"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2 } from "lucide-react";
import { sendSantisTechRiderFollowupAction } from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Alert, GlassPanel } from "@/components/hos";

type Result =
  | { ok: true; emailId: string; email: string }
  | { ok: false; error: string };

export function SantisFollowupButton() {
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  async function handleSend() {
    const conf = await confirm({
      title: "Avisar a SANTIS",
      message:
        "¿Mandar el email a SANTIS agradeciéndole por el bug y pidiéndole que pruebe?",
      confirmLabel: "Enviar",
    });
    if (!conf.ok) return;
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
        variant="clay"
        onClick={handleSend}
        disabled={isPending}
      >
        <Send className="w-4 h-4 mr-2" />
        {isPending ? "Enviando…" : "Avisar a SANTIS del fix de tech rider"}
      </Button>

      {result && !result.ok && (
        <Alert tone="danger" title="Error">
          {result.error}
        </Alert>
      )}

      {result && result.ok && (
        <GlassPanel>
          <div className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Enviado a {result.email}</div>
              <div className="font-mono text-[11px] text-fg-subtle mt-0.5">
                {result.emailId}
              </div>
            </div>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
