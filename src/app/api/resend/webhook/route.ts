/**
 * Webhook de Resend — eventos de entrega de la campaña (Capa 2 dashboard).
 *
 * Recibe email.sent / delivered / delivery_delayed / bounced / complained /
 * opened / clicked. Verifica la firma Svix (manual con crypto, sin dep extra)
 * y guarda:
 *   - email_events: historial append-only (cuenta distinct por tipo).
 *   - email_sends:  estado actual del envío (upsert por resend_id).
 *
 * Escribe con service_role (createAdminClient → salta RLS). El secret de
 * firma vive en RESEND_WEBHOOK_SECRET (.env.local + Vercel).
 *
 * Inbound (correos entrantes a hola@dropgigs.com) es OTRA config y no entra
 * por acá — solo eventos de email saliente.
 */
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verifica la firma Svix: HMAC-SHA256(secret, `${id}.${ts}.${body}`). */
function verifySvix(
  secret: string,
  payload: string,
  id: string,
  timestamp: string,
  signatureHeader: string
): boolean {
  if (!secret || !id || !timestamp || !signatureHeader) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signed = `${id}.${timestamp}.${payload}`;
  const expected = crypto.createHmac("sha256", key).update(signed).digest("base64");
  const expectedBuf = Buffer.from(expected);
  // El header trae una lista separada por espacio: "v1,<sig> v1,<sig2>"
  return signatureHeader.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const sigBuf = Buffer.from(sig);
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

export async function POST(req: Request) {
  const payload = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] falta RESEND_WEBHOOK_SECRET");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const ok = verifySvix(
    secret,
    payload,
    req.headers.get("svix-id") ?? "",
    req.headers.get("svix-timestamp") ?? "",
    req.headers.get("svix-signature") ?? ""
  );
  if (!ok) {
    console.warn("[resend-webhook] firma inválida");
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }

  let evt: { type?: string; created_at?: string; data?: Record<string, unknown> };
  try {
    evt = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = evt.type ?? "";
  // Solo eventos de email saliente; ignorar contact.* / domain.*
  if (!type.startsWith("email.")) {
    return NextResponse.json({ ok: true, ignored: type });
  }

  const data = evt.data ?? {};
  const emailId = typeof data.email_id === "string" ? data.email_id : null;
  if (!emailId) {
    return NextResponse.json({ ok: true, skipped: "sin email_id" });
  }
  const shortType = type.slice("email.".length); // delivered, bounced, ...
  const to = data.to;
  const toEmail = Array.isArray(to)
    ? String(to[0] ?? "")
    : typeof to === "string"
      ? to
      : "";
  const occurredAt = evt.created_at ?? new Date().toISOString();

  const admin = createAdminClient();

  const ev = await admin.from("email_events").insert({
    resend_id: emailId,
    event_type: shortType,
    occurred_at: occurredAt,
    payload: evt,
  });
  const snd = await admin.from("email_sends").upsert(
    {
      resend_id: emailId,
      to_email: toEmail,
      last_event: shortType,
      last_event_at: occurredAt,
    },
    { onConflict: "resend_id" }
  );

  if (ev.error || snd.error) {
    console.error("[resend-webhook] error DB", {
      ev: ev.error?.message,
      snd: snd.error?.message,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
