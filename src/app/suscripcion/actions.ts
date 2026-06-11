"use server";

/**
 * Sprint S19 — Server actions del flow de checkout de suscripción.
 *
 * subscribeAction(): recibe el card_token generado por MP SDK en el
 * cliente y crea la preapproval (PAT). Si MP rechaza la recurrencia
 * (típicamente RedCompra puro), devolvemos un error con flag
 * `needsManualMode` para que el form ofrezca fallback.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPreapproval,
  cancelPreapproval,
  PreapprovalError,
  isMpConfigured,
} from "@/lib/mercadopago/client";
import { getOrCreateSubscription } from "@/lib/queries/subscription";

type SubscribeResult =
  | { ok: true; preapprovalId: string; status: string }
  | { ok: false; error: string; needsManualMode?: boolean };

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://dropgigs.com"
  );
}

export async function subscribeAction(input: {
  cardTokenId: string;
}): Promise<SubscribeResult> {
  if (!isMpConfigured()) {
    return { ok: false, error: "MercadoPago no está configurado en este entorno." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "No hay sesión activa." };
  }

  // 1. Asegurar que existe row en subscriptions
  const subscription = await getOrCreateSubscription(user.id);
  if (subscription.status === "active") {
    return { ok: false, error: "Ya tienes una suscripción activa." };
  }

  // 2. Crear preapproval en MP
  const backUrl = `${getSiteUrl()}/configuracion/suscripcion`;
  let preapproval;
  try {
    preapproval = await createPreapproval({
      cardTokenId: input.cardTokenId,
      payerEmail: user.email,
      externalReference: subscription.id,
      backUrl,
    });
  } catch (e) {
    if (e instanceof PreapprovalError) {
      // Detectar errores comunes que justifican fallback a modo manual
      const msg = e.message.toLowerCase();
      const isCardNotRecurrent =
        msg.includes("recurr") ||
        msg.includes("invalid card") ||
        msg.includes("card_token");
      return {
        ok: false,
        error: e.message,
        needsManualMode: isCardNotRecurrent,
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
  }

  // 3. Guardar en DB (service_role bypassea RLS)
  const admin = createAdminClient();
  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const newStatus =
    preapproval.status === "authorized" ? "active" : "pending";

  const { error: updErr } = await admin
    .from("subscriptions")
    .update({
      status: newStatus,
      mp_preapproval_id: preapproval.id,
      mp_payer_id: preapproval.payer_id ?? null,
      payment_mode: "auto",
      current_period_start: now.toISOString(),
      current_period_end: nextMonth.toISOString(),
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
    })
    .eq("id", subscription.id);

  if (updErr) {
    return { ok: false, error: `DB update: ${updErr.message}` };
  }

  return { ok: true, preapprovalId: preapproval.id, status: newStatus };
}

// ─── F4 · Gestión de la suscripción ──────────────────────────────────

type SimpleResult = { ok: true } | { ok: false; error: string };

/**
 * Cancela la suscripción activa del user. Política:
 *   - Setea cancel_at_period_end=true → MANTIENE acceso hasta el fin
 *     del período pagado (current_period_end). No reembolsa.
 *   - Cancela la preapproval en MP para que no se cobre el próximo mes.
 *   - Status pasa a 'cancelled'. El layout sigue dándole acceso hasta
 *     current_period_end gracias a evaluateSubscriptionAccess.
 *   - Después de current_period_end, el webhook (o el chequeo del
 *     layout en el próximo render) lo marca como 'expired'.
 *   - Opcional: reason del cancel para telemetría.
 */
export async function cancelSubscriptionAction(input: {
  reason?: string;
}): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No hay sesión" };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, status, mp_preapproval_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub) return { ok: false, error: "No tienes suscripción" };
  type Sub = { id: string; status: string; mp_preapproval_id: string | null };
  const s = sub as Sub;
  if (s.status !== "active" && s.status !== "past_due") {
    return { ok: false, error: "La suscripción no está activa" };
  }

  // 1. Cancelar en MP (si tiene preapproval)
  if (s.mp_preapproval_id && isMpConfigured()) {
    try {
      await cancelPreapproval(s.mp_preapproval_id);
    } catch (e) {
      // No bloqueamos la cancelación local si MP falla — el user nos
      // pide cancelar, no podemos dejarlo en limbo. Logueamos.
      console.error("[cancelSubscription] MP cancel error:", e);
    }
  }

  // 2. Marcar como cancelled en DB. Mantiene acceso hasta period_end.
  const { error: updErr } = await admin
    .from("subscriptions")
    .update({
      status: "cancelled",
      cancel_at_period_end: true,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: input.reason?.slice(0, 500) || null,
    })
    .eq("id", s.id);

  if (updErr) return { ok: false, error: `DB: ${updErr.message}` };

  revalidatePath("/configuracion/suscripcion");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Reactivar una suscripción cancelled-pending-end-of-period (el user
 * cambió de idea antes de que expirara). Solo flippea cancel_at_period_end
 * y status. NO reintenta cobro — la preapproval en MP sigue cancelada
 * después del revoke; si queremos volver a cobrarle, debe entrar a
 * /suscripcion y hacer checkout de nuevo. Por simplicidad de v1.
 *
 * En realidad la versión limpia: el user vuelve a /suscripcion y paga
 * de cero. NO reactivamos preapprovals — hace falta nuevo card token.
 */
export async function reactivateSubscriptionAction(): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No hay sesión" };

  // No hacemos nada del backend de MP — el flow correcto es checkout
  // de cero. Simplemente marcamos como 'trial' temporal (con 0 días)
  // para que el modal de paywall lo lleve a /suscripcion al refresh.
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) return { ok: false, error: "No tienes suscripción" };
  type Sub = { id: string; status: string };
  const s = sub as Sub;
  if (s.status !== "cancelled" && s.status !== "expired") {
    return { ok: false, error: "Tu suscripción no está cancelada" };
  }

  // Resetear flags para que pueda volver a /suscripcion y pagar
  const { error: updErr } = await admin
    .from("subscriptions")
    .update({
      cancel_at_period_end: false,
      cancelled_at: null,
      cancellation_reason: null,
    })
    .eq("id", s.id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/configuracion/suscripcion");
  return { ok: true };
}
