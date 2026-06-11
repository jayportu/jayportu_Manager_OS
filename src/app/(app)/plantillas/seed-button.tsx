"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { seedTemplatesAction } from "./actions";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Sparkles } from "lucide-react";

export function SeedButton() {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await seedTemplatesAction();
      if (result.ok) {
        router.refresh();
      } else {
        await confirm({
          title: "Error",
          message: result.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
      }
    });
  }

  return (
    <Button onClick={handleSeed} disabled={isPending}>
      <Sparkles className="w-4 h-4" />
      {isPending ? "Cargando…" : "Cargar 6 plantillas de ejemplo"}
    </Button>
  );
}
