"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, X } from "lucide-react";
import { setBookerVerifiedAction } from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";

interface Props {
  bookerUserId: string;
  verified: boolean;
  name: string;
}

export function VerifyBookerButton({ bookerUserId, verified, name }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    const next = !verified;
    const res = await confirm({
      title: next ? "Verificar booker" : "Quitar verificación",
      message: next
        ? `Verificar a "${name}". Aparecerá con el badge ✓ y podrá salir en el directorio de lugares.`
        : `¿Quitar la verificación de "${name}"?`,
      confirmLabel: next ? "Verificar" : "Quitar",
    });
    if (!res.ok) return;
    setError(null);
    startTransition(async () => {
      const res = await setBookerVerifiedAction(bookerUserId, next);
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
        title={verified ? "Quitar verificación" : "Verificar booker"}
      >
        {verified ? (
          <>
            <X className="w-3 h-3" /> Quitar
          </>
        ) : (
          <>
            <BadgeCheck className="w-3 h-3" /> Verificar
          </>
        )}
      </button>
      {error && <span className="text-[10px] text-danger max-w-[160px] text-right">{error}</span>}
    </div>
  );
}
