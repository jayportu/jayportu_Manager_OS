"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { syncEventsAction } from "./actions";
import { acquireSyncLock, releaseSyncLock, useIsSyncing } from "./sync-lock";

export function SyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const globallySyncing = useIsSyncing();

  function handleClick() {
    // No dispares si AutoSync (u otro click) ya está sincronizando.
    if (!acquireSyncLock()) return;
    startTransition(async () => {
      try {
        const result = await syncEventsAction();
        if (result.ok) {
          router.push(`/calendario?synced=${result.data.pulled}`);
          router.refresh();
        } else {
          router.push(`/calendario?error=${encodeURIComponent(result.error)}`);
        }
      } finally {
        releaseSyncLock();
      }
    });
  }

  const busy = isPending || globallySyncing;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={busy}
    >
      <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Sincronizando…" : "Sincronizar"}
    </Button>
  );
}
