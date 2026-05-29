"use server";

/**
 * Sprint S19 — Server actions del flow de checkout de suscripción.
 *
 * subscribeAction(): recibe el card_token generado por MP SDK en el
 * cliente y crea la preapproval (PAT). Si MP rechaza la recurrencia
 * (típicamente RedCompra puro), devolvemos un error con flag
 * `needsManualMode` para que el form ofrezca fallback.
 */

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPreapproval,
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
    "https://jayportu-manager-os.vercel.app"
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
