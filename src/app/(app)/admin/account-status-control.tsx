"use client";

/**
 * Control de moderación en el backoffice (filas de usuarios onboarded no-admin).
 * Suspender (temporal) · Banear (permanente) · Reactivar · Eliminar (borra todo).
 * Usa el sistema de diálogos unificado (useConfirm) — no popups del navegador.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, PauseCircle, RotateCcw, Trash2 } from "lucide-react";
import { setAccountStatusAction, deleteUserAction } from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { adminBtn } from "@/components/admin/buttons";
import type { AccountStatus } from "@/types/database";

interface Props {
  userId: string;
  artistName: string;
  status: AccountStatus;
}

export function AccountStatusControl({ userId, artistName, status }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "err"; message: string } | null
  >(null);

  const who = artistName || "este usuario";

  async function changeStatus(next: AccountStatus) {
    let reason = "";
    if (next === "suspended" || next === "banned") {
      const verb = next === "suspended" ? "Suspender" : "Banear";
      const res = await confirm({
        title: `${verb} cuenta`,
        message: (
          <>
            {next === "suspended" ? "Suspender" : "Banear"} a <strong>{who}</strong>. El
            motivo queda en el historial.
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
        title: "Reactivar cuenta",
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
      const res = await setAccountStatusAction(userId, next, reason);
      if (!res.ok) {
        setFeedback({ kind: "err", message: res.error });
        return;
      }
      setFeedback({
        kind: "ok",
        message:
          next === "suspended"
            ? "Cuenta suspendida."
            : next === "banned"
              ? "Cuenta baneada."
              : "Cuenta reactivada.",
      });
      router.refresh();
    });
  }

  async function remove() {
    const res = await confirm({
      title: "⚠ Eliminar cuenta",
      message: (
        <>
          Vas a eliminar a <strong>{who}</strong> de forma <strong>permanente</strong>.
          Esto borra la cuenta y TODO su contenido (perfil, contactos, bookings,
          favoritos…). <strong>No se puede deshacer.</strong> Distinto de banear, que
          conserva los datos.
        </>
      ),
      variant: "danger",
      confirmLabel: "Eliminar definitivamente",
      typeToConfirm: "ELIMINAR",
    });
    if (!res.ok) return;

    setFeedback(null);
    startTransition(async () => {
      const r = await deleteUserAction(userId);
      if (!r.ok) {
        setFeedback({ kind: "err", message: r.error });
        return;
      }
      // La fila desaparece al refrescar.
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
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className={adminBtn("dangerSolid")}
          title="Eliminar la cuenta y todos sus datos (irreversible)"
        >
          <Trash2 className="w-3 h-3" />
          Eliminar
        </button>
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
