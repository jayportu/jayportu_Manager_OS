"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscriptionAction } from "@/app/suscripcion/actions";
import { Button } from "@/components/ui/button";
import { Alert, FIELD } from "@/components/hos";

export function CancelSubscriptionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await cancelSubscriptionAction({ reason });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-danger/40 bg-danger/5 px-4 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-danger transition-colors hover:bg-danger/10"
      >
        Cancelar suscripción
      </button>
    );
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-danger/40 bg-danger/5 p-4">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-danger">
        — ¿SEGURO QUE QUIERES CANCELAR?
      </div>
      <ul className="text-sm space-y-1 text-white/70">
        <li>· Mantienes acceso hasta el fin del período pagado.</li>
        <li>· No se cobra más después de esa fecha.</li>
        <li>· Sin reembolso parcial.</li>
        <li>· Tus datos no se borran — puedes reactivar cuando quieras.</li>
      </ul>
      <div className="space-y-1.5">
        <label
          htmlFor="cancel-reason"
          className="block font-mono text-[10px] uppercase tracking-wider text-white/40"
        >
          ¿Por qué cancelas? (opcional)
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Tu feedback me ayuda a mejorar DROP…"
          disabled={isPending}
          className={FIELD}
        />
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="clay"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1"
        >
          Mejor sigo
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 rounded-full"
        >
          {isPending ? "Cancelando…" : "Confirmar cancelación"}
        </Button>
      </div>
    </div>
  );
}
