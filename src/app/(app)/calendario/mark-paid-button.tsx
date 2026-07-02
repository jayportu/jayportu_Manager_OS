"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { updateEventFinanceAction } from "./actions";

/**
 * Marca un gig como pagado de un click. Reutiliza updateEventFinanceAction,
 * que setea paid_at=now() al pasar a 'paid' y revalida /calendario.
 */
export function MarkPaidButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await updateEventFinanceAction(eventId, {
        payment_status: "paid",
      });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-stretch gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title="Marcar como pagado"
        className="inline-flex items-center justify-center gap-1.5 h-8 px-3 border-2 border-success bg-success text-white dark:text-ink hover:opacity-90 font-mono text-[10px] font-bold uppercase tracking-wider transition-opacity disabled:opacity-50"
      >
        <Check className="w-3 h-3" aria-hidden="true" />
        {isPending ? "..." : "Pagado"}
      </button>
      {error && (
        <span className="font-mono text-[9px] text-danger">{error}</span>
      )}
    </div>
  );
}
