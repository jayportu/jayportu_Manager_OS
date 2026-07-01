"use client";

/**
 * Moderación de un booker en el backoffice: Suspender · Banear · Reactivar.
 * Migration 0063. Usa el sistema de diálogos unificado (useConfirm).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, RotateCcw } from "lucide-react";
import { setBookerAccountStatusAction } from "../actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { adminBtn } from "@/components/admin/buttons";
import type { AccountStatus } from "@/types/database";

interface Props {
  bookerUserId: string;
  name: string;
  status: AccountStatus;
}

export function BookerStatusControl({ bookerUserId, name, status }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; message: string } | null
  >(null);

  const who = name || "este booker";

  async function changeStatus(next: AccountStatus) {
    let reason = "";
    if (next === "suspended" || next === "banned") {
      const verb = next === "suspended" ? "Suspender" : "Banear";
      const res = await confirm({
        title: `${verb} booker`,
        message: (
          <>
            {verb} a <strong>{who}</strong>. El motivo queda en el historial.
          </>
        ),
        variant: next === "suspended" ? "warning" : "danger",
        confirmLabel: verb,
        requireReason: true,
        reasonPlaceholder: "Motivo (obligatorio)…",
      });
      if (!res.ok) return;
      reason = res.reason;
    } else {
      const res = await confirm({
        title: "Reactivar booker",
        message: (
          <>
            ¿Reactivar la cuenta de <strong>{who}</strong>?
          </>
        ),
        confirmLabel: "Reactivar",
      });
      if (!res.ok) return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await setBookerAccountStatusAction(bookerUserId, next, reason);
      if (!res.ok) {
        setFeedback({ kind: "err", message: res.error });
        return;
      }
      setFeedback({
        kind: "ok",
        message:
          next === "suspended"
            ? "Booker suspendido."
            : next === "banned"
              ? "Booker baneado."
              : "Booker reactivado.",
      });
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="inline-flex items-center gap-1 flex-wrap justify-end">
        {status !== "active" && (
          <button
            type="button"
            onClick={() => changeStatus("active")}
            disabled={pending}
            className={adminBtn("primary")}
            title="Reactivar cuenta"
          >
            <RotateCcw className="w-3 h-3" />
            Reactivar
          </button>
        )}
        {status === "active" && (
          <button
            type="button"
            onClick={() => changeStatus("suspended")}
            disabled={pending}
            className={adminBtn("warn")}
            title="Suspender temporalmente"
          >
            <PauseCircle className="w-3 h-3" />
            Suspender
          </button>
        )}
        {status !== "banned" && (
          <button
            type="button"
            onClick={() => changeStatus("banned")}
            disabled={pending}
            className={adminBtn("danger")}
            title="Banear permanentemente"
          >
            <Ban className="w-3 h-3" />
            Banear
          </button>
        )}
      </div>
      {feedback && (
        <div
          className={`text-[10px] max-w-[200px] text-right ${
            feedback.kind === "ok" ? "text-success" : "text-danger"
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
