import { Card } from "@/components/ui/card";
import { Mail, Shield } from "lucide-react";
import {
  listBetaReminderRecipients,
} from "./actions";
import { BetaReminderClient } from "./beta-reminder-client";
import { SantisFollowupButton } from "./santis-followup-button";

export const dynamic = "force-dynamic";

export default async function BetaReminderPage() {
  const result = await listBetaReminderRecipients();
  const recipients = result.ok ? result.recipients : [];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-7">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-accent mb-2">
          — ADMIN · BETA
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="w-6 h-6 text-accent" />
          Recordatorio beta
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          Manda un correo personalizado a todos los DJs con beta activa.
          Cada uno recibe su nombre y los días que le quedan. El cuerpo invita
          a seguir usando la app, reportar bugs y dejar feedback.
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            — Destinatarios ({recipients.length})
          </div>
          <h2 className="font-display text-2xl leading-none mt-2">
            Beta activa
            <span className="text-orange">.</span>
          </h2>
        </div>

        {!result.ok ? (
          <div className="text-sm text-danger">
            Error cargando destinatarios: {result.error}
          </div>
        ) : recipients.length === 0 ? (
          <div className="text-sm text-fg-muted">
            No hay DJs con beta activa en este momento.
          </div>
        ) : (
          <div className="border-2 border-ink">
            <table className="w-full text-sm">
              <thead className="bg-ink text-cream">
                <tr>
                  <th className="text-left p-2 font-mono text-[10px] uppercase tracking-wider">
                    DJ
                  </th>
                  <th className="text-left p-2 font-mono text-[10px] uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-right p-2 font-mono text-[10px] uppercase tracking-wider">
                    Días restantes
                  </th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r, idx) => (
                  <tr
                    key={r.userId}
                    className={idx % 2 === 0 ? "bg-white" : "bg-bg-subtle"}
                  >
                    <td className="p-2 font-medium">{r.artistName}</td>
                    <td className="p-2 text-fg-muted">{r.email}</td>
                    <td className="p-2 text-right font-mono">
                      <span
                        className={
                          r.daysRemaining <= 3
                            ? "text-danger font-bold"
                            : r.daysRemaining <= 7
                              ? "text-orange font-bold"
                              : ""
                        }
                      >
                        {r.daysRemaining}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t-2 border-ink pt-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-2">
            — Disparar
          </div>
          <p className="text-xs text-fg-muted mb-4">
            Subject: <span className="font-mono">Tu beta de DROP — quedan {"{N}"} días</span>{" "}
            · From: <span className="font-mono">{process.env.RESEND_FROM_EMAIL || "(env RESEND_FROM_EMAIL)"}</span>
          </p>
          <BetaReminderClient recipientCount={recipients.length} />
        </div>

        <div className="text-[11px] text-fg-subtle border-t border-border pt-3 flex items-start gap-2">
          <Shield className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
          <span>
            Solo admins ven esta pantalla. El envío se hace desde el server con
            la API key de Resend ya configurada en Vercel. Los emails se mandan
            secuencialmente (~0.6s entre uno y otro) para respetar el rate
            limit del plan free.
          </span>
        </div>
      </Card>

      {/* Email puntual de seguimiento a un bug reporter (SANTIS) */}
      <Card className="p-6 space-y-4 mt-8">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            — Bug followup
          </div>
          <h2 className="font-display text-2xl leading-none mt-2">
            Agradecer a SANTIS<span className="text-orange">.</span>
          </h2>
          <p className="text-sm text-fg-muted mt-2 max-w-2xl">
            Email puntual a SANTIS para cerrarle el loop del bug del tech
            rider que reportó. Le agrada el reporte, le cuenta qué se
            arregló y le pide que pruebe en /perfil, /configuracion y su
            press kit público.
          </p>
        </div>
        <SantisFollowupButton />
      </Card>
    </div>
  );
}
