import { Mail, Shield } from "lucide-react";
import {
  listBetaReminderRecipients,
} from "./actions";
import { BetaReminderClient } from "./beta-reminder-client";
import { SantisFollowupButton } from "./santis-followup-button";
import {
  SectionHero,
  GlassPanel,
  MonoLabel,
  Alert,
  EmptyState,
  TableShell,
  Th,
  Td,
} from "@/components/hos";

export const dynamic = "force-dynamic";

export default async function BetaReminderPage() {
  const result = await listBetaReminderRecipients();
  const recipients = result.ok ? result.recipients : [];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <SectionHero
        kicker="ADMIN · BETA"
        title="Recordatorio beta"
        sub="Manda un correo personalizado a todos los DJs con beta activa. Cada uno recibe su nombre y los días que le quedan. El cuerpo invita a seguir usando la app, reportar bugs y dejar feedback."
      />

      <GlassPanel>
        <div className="space-y-5">
          <div>
            <MonoLabel>Destinatarios ({recipients.length})</MonoLabel>
            <h2 className="font-display text-2xl leading-none mt-2">
              Beta activa
              <span className="text-orange">.</span>
            </h2>
          </div>

          {!result.ok ? (
            <Alert tone="danger" title="Error">
              Error cargando destinatarios: {result.error}
            </Alert>
          ) : recipients.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Sin beta activa"
              sub="No hay DJs con beta activa en este momento."
            />
          ) : (
            <GlassPanel padded={false}>
              <TableShell bare>
                <thead>
                  <tr>
                    <Th>DJ</Th>
                    <Th>Email</Th>
                    <Th align="right">Días restantes</Th>
                  </tr>
                </thead>
                <tbody>
                  {recipients.map((r, idx) => (
                    <tr
                      key={r.userId}
                      className={idx % 2 === 0 ? "bg-white/[0.03]" : ""}
                    >
                      <Td className="font-medium text-white">{r.artistName}</Td>
                      <Td className="text-fg-muted">{r.email}</Td>
                      <Td align="right" className="font-mono">
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
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            </GlassPanel>
          )}

          <div className="border-t border-white/10 pt-5">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-fg-muted mb-2">
              — Disparar
            </div>
            <p className="text-xs text-fg-muted mb-4">
              Subject: <span className="font-mono">Tu beta de DROP — quedan {"{N}"} días</span>{" "}
              · From: <span className="font-mono">{process.env.RESEND_FROM_EMAIL || "(env RESEND_FROM_EMAIL)"}</span>
            </p>
            <BetaReminderClient recipientCount={recipients.length} />
          </div>

          <div className="text-[11px] text-fg-subtle border-t border-white/10 pt-3 flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
            <span>
              Solo admins ven esta pantalla. El envío se hace desde el server con
              la API key de Resend ya configurada en Vercel. Los emails se mandan
              secuencialmente (~0.6s entre uno y otro) para respetar el rate
              limit del plan free.
            </span>
          </div>
        </div>
      </GlassPanel>

      {/* Email puntual de seguimiento a un bug reporter (SANTIS) */}
      <GlassPanel className="mt-8">
        <div className="space-y-4">
          <div>
            <MonoLabel>Bug followup</MonoLabel>
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
        </div>
      </GlassPanel>
    </div>
  );
}
