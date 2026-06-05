"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, X } from "lucide-react";
import { setDjVerifiedAction } from "./actions";

interface Props {
  djUserId: string;
  verified: boolean;
  name: string;
}

/**
 * Fase 1 · 1A — Toggle de verificación de DJ (curaduría admin). Espeja a
 * VerifyBookerButton. El badge "✓ Verificado" aparece en /dj y en la ficha.
 */
export function VerifyDjButton({ djUserId, verified, name }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handle() {
    const next = !verified;
    if (
      !window.confirm(
        next
          ? `¿Verificar a "${name}"? Aparecerá con el badge ✓ Verificado en /dj y en su press kit.`
          : `¿Quitar la verificación de "${name}"?`
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await setDjVerifiedAction(djUserId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className={`inline-flex items-center gap-1 px-2 py-1 border font-mono text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50 ${
          verified
            ? "border-fg-muted/40 text-fg-muted hover:bg-fg-muted hover:text-white"
            : "border-success/50 text-success hover:bg-success hover:text-white"
        }`}
        title={verified ? "Quitar verificación" : "Verificar DJ"}
      >
        {verified ? (
          <>
            <X className="w-3 h-3" /> Quitar ✓
          </>
        ) : (
          <>
            <BadgeCheck className="w-3 h-3" /> Verificar
          </>
        )}
      </button>
      {error && (
        <span className="text-[10px] text-danger max-w-[160px] text-right">
          {error}
        </span>
      )}
    </div>
  );
}
