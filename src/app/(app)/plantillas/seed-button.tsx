"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { seedTemplatesAction } from "./actions";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";

export function SeedButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSeed() {
    startTransition(async () => {
      const result = await seedTemplatesAction();
      if (result.ok) {
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
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
