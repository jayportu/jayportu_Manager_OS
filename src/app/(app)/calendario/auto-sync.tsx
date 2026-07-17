"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { syncEventsAction } from "./actions";
import { acquireSyncLock, releaseSyncLock } from "./sync-lock";
import { RefreshCw } from "lucide-react";

interface Props {
  /** ISO string del último sync registrado (de gmail_connections.last_sync_at) */
  lastSyncAt: string | null;
  /** Minutos máximos sin sincronizar antes de auto-disparar */
  staleMinutes?: number;
}

/**
 * Auto-sync silencioso al montar /calendario.
 *
 * Lógica:
 * - Si nunca se sincronizó → dispara
 * - Si pasaron más de staleMinutes desde la última → dispara
 * - Si ya está fresco → no hace nada
 *
 * Solo corre 1 vez por montaje (no es polling continuo).
 */
export function AutoSync({ lastSyncAt, staleMinutes = 5 }: Props) {
  const router = useRouter();
  const ran = useRef(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const now = Date.now();
    const last = lastSyncAt ? new Date(lastSyncAt).getTime() : 0;
    const diffMin = (now - last) / 60000;

    if (last && diffMin < staleMinutes) {
      // Sync reciente, no hace falta
      return;
    }

    // Si el botón manual ya está sincronizando, no disparamos otro en paralelo.
    if (!acquireSyncLock()) return;

    setSyncing(true);
    void (async () => {
      try {
        await syncEventsAction();
        router.refresh();
      } catch {
        // Silencioso
      } finally {
        setSyncing(false);
        releaseSyncLock();
      }
    })();
  }, [lastSyncAt, staleMinutes, router]);

  if (!syncing) return null;
  return (
    <div className="hos-glass fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl text-xs">
      <RefreshCw className="w-3.5 h-3.5 animate-spin text-accent" />
      Sincronizando calendario…
    </div>
  );
}
