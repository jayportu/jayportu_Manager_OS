"use client";

/**
 * F0/C-04 — Interstitial de aceptación diferida de Términos+Privacidad.
 *
 * El layout de /booker lo renderiza en lugar del contenido cuando
 * booker.tos_accepted_at es NULL (cuentas creadas antes de que el signup
 * registrara consentimiento). Bloquea el portal hasta aceptar.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TOS_VERSION_LABEL } from "@/lib/legal";
import { acceptBookerTos } from "./actions";

export function BookerTosGate() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const res = await acceptBookerTos();
      if (!res.ok) {
        setError(res.error || "No se pudo guardar. Intenta de nuevo.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="border-2 border-border bg-bg-panel p-6 space-y-4">
        <h1 className="font-mono text-sm font-bold uppercase tracking-wider text-fg">
          Actualizamos nuestros términos
        </h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          Para seguir usando DROP como booker necesitamos que aceptes los
          Términos de servicio y la Política de privacidad vigentes (actualizados
          el {TOS_VERSION_LABEL}). Toma un segundo.
        </p>

        <label className="flex items-start gap-2.5 text-[13px] text-fg-muted leading-snug cursor-pointer select-none">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-orange cursor-pointer"
          />
          <span>
            He leído y acepto los{" "}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline hover:text-orange transition-colors"
            >
              Términos de servicio
            </a>{" "}
            y la{" "}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-fg underline hover:text-orange transition-colors"
            >
              Política de privacidad
            </a>
            .
          </span>
        </label>

        {error && (
          <div className="border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <Button
          type="button"
          variant="default"
          size="lg"
          disabled={!accepted || pending}
          onClick={handleAccept}
          className="w-full"
        >
          {pending ? "Guardando…" : "Aceptar y continuar →"}
        </Button>
      </div>
    </div>
  );
}
