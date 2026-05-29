/**
 * Sprint S19 — Webhook de MercadoPago.
 *
 * MP nos manda notificaciones cuando ocurren eventos de pago o de
 * suscripción (preapproval). Este endpoint:
 *
 *   1. Verifica la firma `x-signature` (HMAC SHA-256 con MP_WEBHOOK_SECRET).
 *   2. Lee el resource_id del payload según el `type`.
 *   3. Fetch del resource fresh desde la API de MP.
 *   4. Sincroniza el estado de la subscription / inserta payment row.
 *
 * Para que MP pueda alcanzar este endpoint en dev, usamos cloudflared
 * tunnel (gratis, sin cuenta). En prod queda en jayportu-manager-os.vercel.app.
 */

import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPreapproval, getPayment } from "@/lib/mercadopago/client";

export const dynamic = "force-dynamic";

/**
 * Verifica la firma del webhook según el formato de MP.
 * Header: `x-signature: ts=<timestamp>,v1=<hash>`
 *   manifest = `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 *   hash esperado = HMAC-SHA256(manifest, MP_WEBHOOK_SECRET)
 *
 * Si MP_WEBHOOK_SECRET no está seteado (entorno dev sin config),
 * permitimos pasar pero logueamos warning. En prod siempre debe estar.
 */
function verifySignature(req: NextRequest, dataId: string): boolean {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[mp-webhook] MP_WEBHOOK_SECRET no configurado — skip verify");
    return true;
  }
  const signature = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  if (!signature) return false;

  const parts = Object.fromEntries(
    signature.split(",").map((kv) => {
      const [k, v] = kv.split("=");
      return [k.trim(), v?.trim() ?? ""];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  // timing-safe compare
  try {
    return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(hmac));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  let body: { type?: string; action?: string; data?: { id?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const dataId = body?.data?.id?.toString();
  if (!dataId) {
    return NextResponse.json({ ok: false, error: "Missing data.id" }, { status: 400 });
  }

  if (!verifySignature(req, dataId)) {
    console.error("[mp-webhook] firma inválida");
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const type = body.type || body.action?.split(".")[0];

  try {
    if (type === "preapproval" || type === "subscription_preapproval") {
      await handlePreapproval(dataId);
    } else if (
      type === "payment" ||
      type === "subscription_authorized_payment"
    ) {
      await handlePayment(dataId);
    } else {
      console.log(`[mp-webhook] type ignorado: ${type}`);
    }
  } catch (e) {
    console.error("[mp-webhook] handler error:", e);
    // Devolvemos 200 igual para que MP no nos siga reintentando si el error
    // es nuestro y no del request. Si fuera del request, 500.
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}

async function handlePreapproval(preapprovalId: string) {
  const preapp = await getPreapproval(preapprovalId);
  const admin = createAdminClient();

  // Match con subscription por mp_preapproval_id o external_reference
  let subscriptionId: string | null = null;
  const { data: subByMp } = await admin
    .from("subscriptions")
    .select("id")
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();
  if (subByMp) subscriptionId = (subByMp as { id: string }).id;

  if (!subscriptionId && preapp.external_reference) {
    const { data: subByRef } = await admin
      .from("subscriptions")
      .select("id")
      .eq("id", preapp.external_reference)
      .maybeSingle();
    if (subByRef) subscriptionId = (subByRef as { id: string }).id;
  }

  if (!subscriptionId) {
    console.warn(`[mp-webhook] preapproval ${preapprovalId} sin match en DB`);
    return;
  }

  // Map MP status → nuestro status
  let newStatus: string;
  switch (preapp.status) {
    case "authorized":
      newStatus = "active";
      break;
    case "paused":
      newStatus = "past_due";
      break;
    case "cancelled":
      newStatus = "expired";
      break;
    case "pending":
    default:
      newStatus = "pending";
  }

  const updates: Record<string, unknown> = {
    status: newStatus,
    mp_preapproval_id: preapprovalId,
  };
  if (preapp.next_payment_date) {
    updates.current_period_end = preapp.next_payment_date;
  }

  await admin
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId);
}

async function handlePayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  const admin = createAdminClient();

  // Match con subscription por external_reference (= subscription.id)
  const subId = payment.external_reference;
  if (!subId) {
    console.warn(`[mp-webhook] payment ${paymentId} sin external_reference`);
    return;
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("id", subId)
    .maybeSingle();
  if (!sub) {
    console.warn(`[mp-webhook] payment ${paymentId} → subscription ${subId} no existe`);
    return;
  }
  const subscription = sub as { id: string; user_id: string };

  // Insertar/upsert payment row (idempotente por mp_payment_id unique)
  const paymentStatus =
    payment.status === "approved"
      ? "approved"
      : payment.status === "rejected"
        ? "rejected"
        : payment.status === "refunded"
          ? "refunded"
          : payment.status === "cancelled"
            ? "cancelled"
            : "pending";

  const { error: upsertErr } = await admin
    .from("subscription_payments")
    .upsert(
      {
        subscription_id: subscription.id,
        user_id: subscription.user_id,
        mp_payment_id: paymentId,
        amount_clp: Math.round(payment.transaction_amount),
        status: paymentStatus,
        payment_method: payment.payment_method_id ?? null,
        raw_metadata: { status_detail: payment.status_detail },
      },
      { onConflict: "mp_payment_id" }
    );
  if (upsertErr) {
    console.error("[mp-webhook] subscription_payments upsert:", upsertErr);
  }

  // Si el payment está approved, actualizar period_end + tarjeta info
  if (payment.status === "approved") {
    const now = new Date();
    const nextPeriod = new Date(now);
    nextPeriod.setMonth(nextPeriod.getMonth() + 1);
    const cardLast4 = payment.card?.last_four_digits ?? null;
    const cardBrand = payment.payment_method_id ?? null;

    await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: nextPeriod.toISOString(),
        ...(cardLast4 ? { card_last_4: cardLast4 } : {}),
        ...(cardBrand ? { card_brand: cardBrand } : {}),
      })
      .eq("id", subscription.id);
  } else if (payment.status === "rejected") {
    await admin
      .from("subscriptions")
      .update({ status: "past_due" })
      .eq("id", subscription.id);
  }
}
