"use client";

/**
 * Sprint S20 — Botón "Limpiar" para usuarios pendientes en el backoffice.
 *
 * Visible solo en filas con onboarding_completed_at=null y is_admin=false.
 * Click → confirm → manda email "necesitas solicitar acceso a la beta" +
 * borra la cuenta de auth.users (cascade).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { notifyAndDeleteUserAction } from "./actions";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { adminBtn } from "@/components/admin/buttons";

interface Props {
  userId: string;
  email: string;
}

export function DeletePendingUserButton({ userId, email }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; message: string }
    | { kind: "err"; message: string }
    | null
  >(null);

  async function handleClick() {
    const res = await confirm({
      title: "Limpiar cuenta huérfana",
      message: (
        <>
          Mandar email a <strong>{email}</strong> avisando que necesita solicitar
          acceso a la beta, y borrar la cuenta. No se puede deshacer.
        </>
      ),
      variant: "danger",
      confirmLabel: "Avisar y borrar",
    });
    if (!res.ok) return;
    setFeedback(null);
    startTransition(async () => {
      const res = await notifyAndDeleteUserAction(userId);
      if (!res.ok) {
        setFeedback({ kind: "err", message: res.error });
        return;
      }
      const emailMsg = res.data.email_sent
        ? "Email enviado y cuenta borrada."
        : `Cuenta borrada — email NO enviado (${res.data.email_error || "error desconocido"}).`;
      setFeedback({ kind: "ok", message: emailMsg });
      router.refresh();
    });
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={adminBtn("danger")}
        title="Avisar al user y borrar cuenta huérfana"
      >
        <Trash2 className="w-3 h-3" />
        {pending ? "Limpiando…" : "Limpiar"}
      </button>
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
