import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SectionHero, GlassPanel, MonoLabel, Badge } from "@/components/hos";
import { Button } from "@/components/ui/button";
import { isLegacyBetaUser } from "@/lib/queries/subscription";
import { CancelSubscriptionButton } from "./cancel-subscription-button";
import { ReactivateSubscriptionButton } from "./reactivate-subscription-button";
import type {
  Subscription,
  SubscriptionPayment,
} from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Sprint S19 F4 — Página de gestión de la suscripción.
 *
 * Muestra: estado actual, plan, próximo cobro, historial de pagos, y
 * botones de cancelar / cambiar tarjeta / reactivar según corresponda.
 *
 * Vive dentro de (app) → bajo el gating, pero un user en estado
 * 'cancelled' con período aún válido todavía tiene acceso (hasta
 * current_period_end).
 */
export default async function SubscripcionMiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("dj_profile")
    .select("beta_status, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  // Legacy beta users no tienen suscripción — los redirigimos
  if (isLegacyBetaUser(profile?.beta_status as never)) {
    redirect("/configuracion");
  }

  const admin = createAdminClient();
  const { data: subRaw } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subRaw) {
    redirect("/suscripcion");
  }
  const subscription = subRaw as Subscription;

  // Historial de pagos (puede estar vacío en TEST mode antes del primer webhook)
  const { data: paymentsRaw } = await admin
    .from("subscription_payments")
    .select("*")
    .eq("subscription_id", subscription.id)
    .order("created_at", { ascending: false })
    .limit(12);
  const payments = (paymentsRaw ?? []) as SubscriptionPayment[];

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <Link
        href="/configuracion"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Configuración
      </Link>
      <SectionHero kicker="Sistema · Suscripción" title="Mi suscripción" />

      {/* Estado principal */}
      <GlassPanel className="mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <MonoLabel>Mi suscripción</MonoLabel>
            <div className="mt-1.5 font-display text-3xl leading-none">
              DROP. Pro<span className="text-orange">.</span>
            </div>
          </div>
          <StatusBadge subscription={subscription} />
        </div>

        <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4">
          <Row label="Plan" value={`$${subscription.amount_clp.toLocaleString("es-CL")} / mes`} />
          {subscription.card_last_4 && (
            <Row
              label="Tarjeta"
              value={`${(subscription.card_brand || "Visa").replace(/^./, (c) => c.toUpperCase())} ••••${subscription.card_last_4}`}
            />
          )}
          {subscription.status === "trial" && subscription.trial_ends_at && (
            <Row
              label="Trial vence"
              value={formatDate(subscription.trial_ends_at)}
            />
          )}
          {subscription.current_period_end && (
            <Row
              label={
                subscription.status === "cancelled"
                  ? "Acceso hasta"
                  : "Próximo cobro"
              }
              value={formatDate(subscription.current_period_end)}
            />
          )}
          {subscription.cancelled_at && (
            <Row
              label="Cancelada el"
              value={formatDate(subscription.cancelled_at)}
            />
          )}
        </div>

        {/* CTAs según estado */}
        {subscription.status === "active" && (
          <div className="mt-5 flex gap-2 flex-wrap border-t border-white/10 pt-4">
            <CancelSubscriptionButton />
          </div>
        )}

        {subscription.status === "cancelled" && (
          <div className="mt-5 flex gap-2 flex-wrap border-t border-white/10 pt-4">
            <ReactivateSubscriptionButton />
            <Button asChild variant="clay">
              <Link href="/suscripcion">Reactivar con nueva tarjeta →</Link>
            </Button>
          </div>
        )}

        {(subscription.status === "trial" || subscription.status === "expired" || subscription.status === "past_due") && (
          <div className="mt-5 flex gap-2 flex-wrap border-t border-white/10 pt-4">
            <Button asChild variant="clayPrimary">
              <Link href="/suscripcion">
                {subscription.status === "trial" ? "Suscribirme ahora →" : "Renovar suscripción →"}
              </Link>
            </Button>
          </div>
        )}
      </GlassPanel>

      {/* Historial */}
      <GlassPanel>
        <MonoLabel>Historial de pagos</MonoLabel>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-white/55">
            Todavía no hay pagos registrados. Cuando se confirme el primer
            cobro lo verás acá.
          </p>
        ) : (
          <div className="mt-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto] gap-3 items-baseline text-sm border-b border-white/10 last:border-b-0 py-2"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                  {formatDate(p.created_at)}
                </span>
                <span className="font-semibold tabular-nums text-white/80">
                  ${p.amount_clp.toLocaleString("es-CL")}
                </span>
                <PaymentStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-white/40">
        {label}
      </span>
      <span className="text-sm font-semibold text-white/80">{value}</span>
    </div>
  );
}

type BadgeTone = "up" | "warn" | "down" | "info" | "neutral";

function StatusBadge({
  subscription,
}: {
  subscription: Subscription;
}) {
  const { status } = subscription;
  let tone: BadgeTone = "neutral";
  let solid = false;
  let label = status.toUpperCase();
  if (status === "active") {
    tone = "up";
    solid = true;
    label = "● ACTIVA";
  } else if (status === "trial") {
    tone = "warn";
    label = "TRIAL";
  } else if (status === "cancelled") {
    tone = "neutral";
    label = "CANCELADA · ACCESO HASTA EL FIN";
  } else if (status === "expired") {
    tone = "down";
    label = "VENCIDA";
  } else if (status === "past_due") {
    tone = "down";
    label = "PAGO PENDIENTE";
  } else if (status === "pending") {
    tone = "info";
    label = "ESPERANDO CONFIRMACIÓN";
  }
  return (
    <Badge tone={tone} solid={solid}>
      {label}
    </Badge>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: BadgeTone }> = {
    approved: { label: "Pagado ✓", tone: "up" },
    rejected: { label: "Rechazado", tone: "down" },
    pending: { label: "Pendiente", tone: "info" },
    refunded: { label: "Reembolsado", tone: "neutral" },
    cancelled: { label: "Cancelado", tone: "neutral" },
  };
  const m = map[status] ?? { label: status, tone: "neutral" as BadgeTone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
