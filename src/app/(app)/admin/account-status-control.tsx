"use client";

/**
 * Migration 0030 — Control de estado de cuenta en el backoffice.
 *
 * Visible en filas de usuarios onboarded no-admin. Permite al admin
 * (Jaime / Fer) suspender (temporal), banear (permanente) o reactivar.
 * Suspender/banear pide motivo (queda en el audit trail).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, RotateCcw } from "lucide-react";
import { setAccountStatusAction } from "./actions";
import type { AccountStatus } from "@/types/database";

interface Props {
  userId: string;
  artistName: string;
  status: AccountStatus;
}

export function AccountStatusControl({ userId, artistName, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; message: string } | null
  >(null);

  const who = artistName || "este usuario";

  function run(next: AccountStatus) {
    let reason = "";
    if (next === "suspended" || next === "banned") {
      const verb = next === "suspended" ? "suspender" : "banear";
      const input = window.prompt(
        `Motivo para ${verb} a ${who} (queda registrado y se usa de referencia):`
      );
      if (input === null) return; // canceló
      reason = input.trim();
      if (reason.length === 0) {
        setFeedback({ kind: "err", message: "El motivo es obligatorio." });
        return;
      }
    } else {
      const ok = window.confirm(`¿Reactivar la cuenta de ${who}?`);
      if (!ok) return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await setAccountStatusAction(userId, next, reason);
      if (!res.ok) {
        setFeedback({ kind: "err", message: res.error });
        return;
      }
      const msg =
        next === "suspended"
          ? "Cuenta suspendida."
          : next === "banned"
            ? "Cuenta baneada."
            : "Cuenta reactivada.";
      setFeedback({ kind: "ok", message: msg });
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1">
        {status !== "active" && (
          <button
            type="button"
            onClick={() => run("active")}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2 py-1 border border-success/50 text-success hover:bg-success hover:text-white font-mono text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50"
            title="Reactivar cuenta"
          >
            <RotateCcw className="w-3 h-3" />
            Reactivar
          </button>
        )}
        {status === "active" && (
          <button
            type="button"
            onClick={() => run("suspended")}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2 py-1 border border-warning/50 text-warning hover:bg-warning hover:text-ink font-mono text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50"
            title="Suspender temporalmente"
          >
            <PauseCircle className="w-3 h-3" />
            Suspender
          </button>
        )}
        {status !== "banned" && (
          <button
            type="button"
            onClick={() => run("banned")}
            disabled={pending}
            className="inline-flex items-center gap-1 px-2 py-1 border border-danger/40 text-danger hover:bg-danger hover:text-white font-mono text-[9px] uppercase tracking-wider transition-colors disabled:opacity-50"
            title="Banear permanentemente"
          >
            <Ban className="w-3 h-3" />
            Banear
          </button>
        )}
      </div>
      {feedback && (
        <div
          className={`text-[10px] max-w-[180px] text-right ${
            feedback.kind === "ok" ? "text-success" : "text-danger"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
