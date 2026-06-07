"use client";

import { useEffect, useRef } from "react";
import { markEmailRead } from "./actions";

/**
 * Dispara markEmailRead al montar (cuando se abre un correo no leído). Vive
 * en el cliente para sacar el write fuera del render del RSC; la server action
 * revalida /admin/correo así la lista refleja el estado "leído".
 */
export function MarkRead({ id }: { id: string }) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === id) return;
    done.current = id;
    void markEmailRead(id).catch((e) =>
      console.error("markEmailRead falló:", e)
    );
  }, [id]);
  return null;
}
