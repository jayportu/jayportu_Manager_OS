"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { sendBetaReminderToAllAction } from "./actions";

interface Props {
  recipientCount: number;
}

type Result =
  | {
      ok: true;
      sent: number;
      failed: number;
      results: Array<{
        recipient: { artistName: string; email: string };
        ok: boolean;
        error?: string;
        emailId?: string;
      }>;
    }
  | { ok: false; error: string };

export function BetaReminderClient({ recipientCount }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<Result | null>(null);

  function handleSend() {
    const message = `¿Mandar el correo recordatorio a ${recipientCount} ${
      recipientCount === 1 ? "DJ" : "DJs"
    }? Se disparan emails reales.`;
    if (!confirm(message)) return;
    setResult(null);
    startTransition(async () => {
      const res = await sendBetaReminderToAllAction();
      setResult(res);
    });
  }

  if (recipientCount === 0) {
    return (
      <Button disabled variant="outline">
        <Send className="w-4 h-4 mr-2" />
        Sin destinatarios
      </Button>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="orange"
        onClick={handleSend}
        disabled={isPending}
      >
        <Send className="w-4 h-4 mr-2" />
        {isPending
          ? `Enviando… (puede tardar ~${Math.max(1, Math.ceil(recipientCount * 0.6))}s)`
          : `Mandar recordatorio a ${recipientCount} ${recipientCount === 1 ? "DJ" : "DJs"}`}
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
        <div className="border-2 border-ink p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Enviados: {result.sent}
            {result.failed > 0 && (
              <span className="text-danger ml-2">
                · Fallidos: {result.failed}
              </span>
            )}
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer font-mono uppercase tracking-wider text-fg-muted">
              Detalle por destinatario
            </summary>
            <ul className="mt-2 space-y-1">
              {result.results.map((r, i) => (
                <li
                  key={i}
                  className={`font-mono text-[11px] flex items-start gap-2 ${
                    r.ok ? "text-success" : "text-danger"
                  }`}
                >
                  <span>{r.ok ? "✓" : "✗"}</span>
                  <span className="flex-1">
                    {r.recipient.artistName} ({r.recipient.email})
                    {r.ok && r.emailId && (
                      <span className="text-fg-subtle"> · {r.emailId.slice(0, 12)}…</span>
                    )}
                    {!r.ok && r.error && (
                      <span className="text-danger"> · {r.error}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );
}
