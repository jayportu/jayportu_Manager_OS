"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reactivateSubscriptionAction } from "@/app/suscripcion/actions";

export function ReactivateSubscriptionButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await reactivateSubscriptionAction();
      if (res.ok) {
        router.push("/suscripcion");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 h-10 px-4 bg-cream text-fg border-2 border-border hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
    >
      {isPending ? "Reactivando…" : "Reactivar"}
    </button>
  );
}
