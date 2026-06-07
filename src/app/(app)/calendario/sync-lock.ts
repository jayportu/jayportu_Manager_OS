"use client";

import { useSyncExternalStore } from "react";

/**
 * Lock compartido (a nivel de módulo) para el sync de calendario. Evita que
 * AutoSync (al montar) y SyncButton (manual) disparen dos syncEventsAction
 * concurrentes, que pisarían inserts/updates entre sí.
 */
let syncing = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

/** Toma el lock. Devuelve false si ya hay un sync en curso. */
export function acquireSyncLock(): boolean {
  if (syncing) return false;
  syncing = true;
  emit();
  return true;
}

export function releaseSyncLock(): void {
  if (!syncing) return;
  syncing = false;
  emit();
}

/** Suscripción reactiva al estado del lock (para deshabilitar UI). */
export function useIsSyncing(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => syncing,
    () => false
  );
}
