"use client";

/**
 * F2b — Tarjeta de verificación self-service en el perfil del booker.
 *  - verificado → no se muestra (el hero ya tiene el badge ✓).
 *  - solicitado (pendiente) → estado "en revisión".
 *  - si no → form con evidencia + botón "Solicitar verificación".
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestBookerVerification } from "../actions";

export function BookerVerificationRequest({
  verified,
  requested,
}: {
  verified: boolean;
  requested: boolean;
}) {
  const router = useRouter();
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (verified) return null;

  if (requested) {
    return (
      <div className="border-2 border-warning/40 bg-warning/10 p-5 mb-6 flex items-start gap-3">
        <Clock className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-warning">
            Verificación en revisión
          </div>
          <p className="text-sm text-fg-muted mt-1">
            Recibimos tu solicitud. Te avisamos por email en cuanto quede verificada.
            Mientras tanto ya puedes buscar y contactar DJs.
          </p>
        </div>
      </div>
    );
  }

  function handleRequest() {
    setError(null);
    startTransition(async () => {
      const res = await requestBookerVerification(evidence);
      if (!res.ok) {
        setError(res.error || "No se pudo enviar. Intenta de nuevo.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border-2 border-border bg-bg-panel p-5 mb-6">
      <div className="flex items-center gap-2">
        <BadgeCheck className="w-5 h-5 text-accent" />
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-fg">
          Verifica tu cuenta
        </div>
      </div>
      <p className="text-sm text-fg-muted mt-2">
        La verificación te habilita para <strong>publicar convocatorias</strong> y te da el
        badge ✓ que ven los DJs. Déjanos un enlace que confirme quién eres — tu Instagram,
        sitio web, o el de tu venue/productora.
      </p>
      <textarea
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="https://instagram.com/tu_venue — o cuéntanos brevemente sobre tus eventos."
        className="mt-3 w-full border-2 border-border bg-bg-panel px-3 py-2 text-sm focus:outline-none focus:border-orange resize-none"
      />
      {error && (
        <div className="mt-2 border-2 border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}
      <Button
        type="button"
        onClick={handleRequest}
        disabled={pending || !evidence.trim()}
        className="mt-3"
      >
        {pending ? "Enviando…" : "Solicitar verificación"}
      </Button>
    </div>
  );
}
