"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Check, Pause, Trash2 } from "lucide-react";
import {
  completeFollowUpAction,
  pauseRecurrenceAction,
  deleteRecurrenceSeriesAction,
} from "../actions";

interface Props {
  followUpId: string;
  seriesId: string;
  contactId: string;
}

export function RecurrentesActions({ followUpId, seriesId, contactId }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function handleComplete() {
    startTransition(async () => {
      await completeFollowUpAction(followUpId, contactId);
      router.refresh();
    });
  }

  async function handlePause() {
    const { ok } = await confirm({
      title: "¿Pausar la recurrencia?",
      message: "El follow-up actual queda pendiente, pero no se generan los siguientes.",
      variant: "warning",
      confirmLabel: "Pausar",
    });
    if (!ok) return;
    startTransition(async () => {
      await pauseRecurrenceAction(seriesId, contactId);
      router.refresh();
    });
  }

  async function handleDelete() {
    const { ok } = await confirm({
      title: "¿Eliminar TODA la serie?",
      message: "Borra el follow-up actual y el historial completo. No se puede deshacer.",
      variant: "danger",
      confirmLabel: "Eliminar serie",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteRecurrenceSeriesAction(seriesId, contactId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={handleComplete}
        disabled={isPending}
        className="p-2 border-2 border-ink bg-success text-white hover:bg-success/90 transition-colors"
        title="Marcar hecho — crea el siguiente automático"
      >
        <Check className="w-4 h-4" />
      </button>
      <button
        onClick={handlePause}
        disabled={isPending}
        className="p-2 border-2 border-ink bg-cream hover:bg-warning hover:text-white transition-colors"
        title="Pausar recurrencia"
      >
        <Pause className="w-4 h-4" />
      </button>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="p-2 border-2 border-ink bg-cream hover:bg-danger hover:text-white transition-colors"
        title="Eliminar serie completa"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
