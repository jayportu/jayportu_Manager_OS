"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { setDjDropPickAction } from "./actions";

/**
 * Fase 1 · RA-2A — Toggle ⭐ para destacar un DJ en la fila "DROP PICKS" de /dj.
 */
export function DropPickButton({
  djUserId,
  isPick,
  name,
}: {
  djUserId: string;
  isPick: boolean;
  name: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setDjDropPickAction(djUserId, !isPick);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggle}
      title={
        isPick
          ? `Quitar "${name}" de DROP Picks`
          : `Marcar "${name}" como DROP Pick`
      }
      className={`inline-flex items-center gap-1 px-2 py-1 border font-mono text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50 ${
        isPick
          ? "border-orange bg-orange text-ink"
          : "border-border text-fg-muted hover:border-orange hover:text-orange"
      }`}
    >
      <Star className="w-3 h-3" fill={isPick ? "currentColor" : "none"} /> Pick
    </button>
  );
}
