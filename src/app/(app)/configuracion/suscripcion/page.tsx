import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
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
      <div className="mb-8">
        <Link
          href="/configuracion"
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted hover:text-fg transition-colors"
        >
          ← Configuración
        </Link>
        <h1
          className="leading-none mt-2"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "48px",
          }}
        >
          Mi suscripción<span className="text-orange">.</span>
        </h1>
      </div>

      {/* Estado principal */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-1">
              — MI SUSCRIPCIÓN
            </div>
            <div
              className="leading-none"
              style={{
                fontFamily:
                  "var(--font-anton), Impact, system-ui, sans-serif",
                fontSize: "32px",
              }}
            >
              DROP. Pro<span className="text-orange">.</span>
            </div>
          </div>
          <StatusBadge subscription={subscription} />
        </div>

        <div className="space-y-2 mb-5">
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
          <div className="flex gap-2 flex-wrap pt-4 border-t border-border">
            <CancelSubscriptionButton />
          </div>
        )}

        {subscription.status === "cancelled" && (
          <div className="flex gap-2 flex-wrap pt-4 border-t border-border">
            <ReactivateSubscriptionButton />
            <Link
              href="/suscripcion"
              className="inline-flex items-center gap-2 h-10 px-4 bg-ink text-orange border-2 border-border hover:bg-orange hover:text-ink font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
            >
              Reactivar con nueva tarjeta →
            </Link>
          </div>
        )}

        {(subscription.status === "trial" || subscription.status === "expired" || subscription.status === "past_due") && (
          <div className="flex gap-2 flex-wrap pt-4 border-t border-border">
            <Link
              href="/suscripcion"
              className="inline-flex items-center gap-2 h-10 px-4 bg-ink text-orange border-2 border-border hover:bg-orange hover:text-ink font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
            >
              {subscription.status === "trial" ? "Suscribirme ahora →" : "Renovar suscripción →"}
            </Link>
          </div>
        )}
      </Card>

      {/* Historial */}
      <Card className="p-6">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
          — HISTORIAL DE PAGOS
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-fg-muted">
            Todavía no hay pagos registrados. Cuando se confirme el primer
            cobro lo verás acá.
          </p>
        ) : (
          <div className="space-y-1">
            {payments.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto] gap-3 items-baseline text-sm border-b border-border last:border-b-0 py-2"
              >
                <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  {formatDate(p.created_at)}
                </span>
                <span className="font-semibold">
                  ${p.amount_clp.toLocaleString("es-CL")}
                </span>
                <PaymentStatusBadge status={p.status} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline border-b border-border last:border-b-0 py-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">
        {label}
      </span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function StatusBadge({
  subscription,
}: {
  subscription: Subscription;
}) {
  const { status } = subscription;
  let bg = "bg-cream";
  let text = "text-fg-muted";
  let border = "border-border";
  let label = status.toUpperCase();
  if (status === "active") {
    bg = "bg-orange";
    text = "text-fg";
    label = "● ACTIVA";
  } else if (status === "trial") {
    bg = "bg-orange";
    text = "text-fg";
    label = "TRIAL";
  } else if (status === "cancelled") {
    bg = "bg-warning";
    text = "text-fg";
    label = "CANCELADA · ACCESO HASTA EL FIN";
  } else if (status === "expired") {
    bg = "bg-danger";
    text = "text-white";
    border = "border-danger";
    label = "VENCIDA";
  } else if (status === "past_due") {
    bg = "bg-warning";
    text = "text-fg";
    label = "PAGO PENDIENTE";
  } else if (status === "pending") {
    bg = "bg-cream";
    text = "text-fg-muted";
    label = "ESPERANDO CONFIRMACIÓN";
  }
  return (
    <span
      className={`inline-block font-mono text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1 border-2 ${bg} ${text} ${border}`}
    >
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "Pagado ✓", cls: "text-success" },
    rejected: { label: "Rechazado", cls: "text-danger" },
    pending: { label: "Pendiente", cls: "text-fg-muted" },
    refunded: { label: "Reembolsado", cls: "text-warning" },
    cancelled: { label: "Cancelado", cls: "text-fg-muted" },
  };
  const m = map[status] ?? { label: status, cls: "text-fg-muted" };
  return (
    <span className={`font-mono text-[10px] uppercase tracking-wider ${m.cls}`}>
      {m.label}
    </span>
  );
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
