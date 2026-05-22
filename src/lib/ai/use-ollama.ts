"use client";

import { useEffect, useState } from "react";
import { checkOllamaStatus, type OllamaStatus } from "./ollama";

/**
 * Hook que checkea si Ollama está disponible.
 * Re-checkea cada 30s mientras el componente esté montado.
 */
export function useOllamaStatus(intervalMs = 30000): {
  status: OllamaStatus;
  loading: boolean;
  refresh: () => void;
} {
  const [status, setStatus] = useState<OllamaStatus>({ available: false });
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    checkOllamaStatus(controller.signal).then((s) => {
      setStatus(s);
      setLoading(false);
    });
    return () => controller.abort();
  }, [tick]);

  useEffect(() => {
    if (intervalMs <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return {
    status,
    loading,
    refresh: () => setTick((t) => t + 1),
  };
}
