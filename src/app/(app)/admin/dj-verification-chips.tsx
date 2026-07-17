"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDjVerificationAction } from "./actions";

/**
 * Fase 1 · 1F — chips de confiabilidad granular en la tabla admin.
 * 3 chequeos manuales: Identidad / Redes / Sets. (Historial es automático.)
 */
const CHECKS = [
  { key: "identity", label: "ID" },
  { key: "socials", label: "Redes" },
  { key: "sets", label: "Sets" },
] as const;

export function DjVerificationChips({
  djUserId,
  verifications,
}: {
  djUserId: string;
  verifications: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle(key: "identity" | "socials" | "sets", on: boolean) {
    startTransition(async () => {
      await setDjVerificationAction(djUserId, key, on);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex gap-1">
      {CHECKS.map((c) => {
        const on = verifications.includes(c.key);
        return (
          <button
            key={c.key}
            type="button"
            disabled={pending}
            onClick={() => toggle(c.key, !on)}
            title={on ? `Quitar ${c.label}` : `Verificar ${c.label}`}
            className={`rounded-full border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
              on
                ? "border-transparent bg-success text-black"
                : "border-white/15 text-white/55 hover:border-success hover:text-success"
            }`}
          >
            {on ? "✓ " : ""}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
