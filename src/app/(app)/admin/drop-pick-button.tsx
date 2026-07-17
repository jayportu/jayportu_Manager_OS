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
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
        isPick
          ? "border-transparent bg-[rgb(var(--drop-orange))] text-black"
          : "border-white/15 text-white/55 hover:border-[rgb(var(--drop-orange))] hover:text-[rgb(var(--drop-orange))]"
      }`}
    >
      <Star className="w-3 h-3" fill={isPick ? "currentColor" : "none"} /> Pick
    </button>
  );
}
