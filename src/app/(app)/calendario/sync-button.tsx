"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncEventsAction } from "./actions";

export function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await syncEventsAction();
      if (result.ok) {
        router.push(`/calendario?synced=${result.data.pulled}`);
        router.refresh();
      } else {
        router.push(`/calendario?error=${encodeURIComponent(result.error)}`);
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Sincronizando…" : "Sincronizar"}
    </Button>
  );
}
