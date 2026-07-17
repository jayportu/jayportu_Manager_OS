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
import { Alert, GlassPanel, FIELD } from "@/components/hos";
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
      <div className="mb-6">
        <Alert tone="warn">
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-warning">
            <Clock className="w-4 h-4 shrink-0" />
            Verificación en revisión
          </span>
          <span className="mt-1 block text-fg-muted">
            Recibimos tu solicitud. Te avisamos por email en cuanto quede verificada.
            Mientras tanto ya puedes buscar y contactar DJs.
          </span>
        </Alert>
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
    <GlassPanel className="mb-6">
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
        className={`${FIELD} mt-3 resize-none`}
      />
      {error && (
        <div className="mt-2">
          <Alert tone="danger">{error}</Alert>
        </div>
      )}
      <Button
        type="button"
        onClick={handleRequest}
        disabled={pending || !evidence.trim()}
        variant="clayPrimary"
        className="mt-3"
      >
        {pending ? "Enviando…" : "Solicitar verificación"}
      </Button>
    </GlassPanel>
  );
}
