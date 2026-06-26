"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSubscriptionAction } from "@/app/suscripcion/actions";

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
        className="inline-flex items-center gap-2 h-10 px-4 bg-cream text-danger border-2 border-danger hover:bg-danger hover:text-white font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
      >
        Cancelar suscripción
      </button>
    );
  }

  return (
    <div className="w-full border-2 border-danger bg-danger/5 p-4 space-y-3">
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-danger">
        — ¿SEGURO QUE QUIERES CANCELAR?
      </div>
      <ul className="text-sm space-y-1">
        <li>· Mantienes acceso hasta el fin del período pagado.</li>
        <li>· No se cobra más después de esa fecha.</li>
        <li>· Sin reembolso parcial.</li>
        <li>· Tus datos no se borran — puedes reactivar cuando quieras.</li>
      </ul>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-wider text-fg-muted block mb-1">
          ¿Por qué cancelas? (opcional)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Tu feedback me ayuda a mejorar DROP…"
          disabled={isPending}
          className="w-full border-2 border-ink bg-bg-panel px-3 py-2 text-sm focus:outline-none focus:border-orange"
        />
      </div>
      {error && (
        <div className="text-sm text-danger">{error}</div>
      )}
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center h-10 px-4 bg-cream text-ink border-2 border-ink hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
        >
          Mejor sigo
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center h-10 px-4 bg-danger text-white border-2 border-danger hover:opacity-90 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
        >
          {isPending ? "Cancelando…" : "Confirmar cancelación"}
        </button>
      </div>
    </div>
  );
}
