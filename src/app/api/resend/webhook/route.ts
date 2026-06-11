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

/** El webhook de inbound trae solo metadata; el cuerpo se pide aparte. */
async function fetchInboundBody(
  emailId: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`,
          "User-Agent": "drop-inbound-webhook",
        },
      }
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const payload = await req.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[resend-webhook] falta RESEND_WEBHOOK_SECRET");
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const svixTimestamp = req.headers.get("svix-timestamp") ?? "";
  const ok = verifySvix(
    secret,
    payload,
    req.headers.get("svix-id") ?? "",
    svixTimestamp,
    req.headers.get("svix-signature") ?? ""
  );
  if (!ok) {
    console.warn("[resend-webhook] firma inválida");
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 401 });
  }
  // Anti-replay (RFC svix): rechazar timestamps fuera de ±5 min. Sin esto, una
  // request firmada capturada podía re-enviarse indefinidamente.
  const tsSec = Number(svixTimestamp);
  if (!Number.isFinite(tsSec) || Math.abs(Date.now() / 1000 - tsSec) > 300) {
    console.warn("[resend-webhook] timestamp fuera de tolerancia (replay?)");
    return NextResponse.json({ ok: false, error: "stale timestamp" }, { status: 401 });
  }

  let evt: { type?: string; created_at?: string; data?: Record<string, unknown> };
  try {
    evt = JSON.parse(payload);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const type = evt.type ?? "";
  const data = evt.data ?? {};
  const admin = createAdminClient();

  // ── INBOUND: correo entrante a hola@dropgigs.com ──────────────────
  if (type === "email.received") {
    const emailId = typeof data.email_id === "string" ? data.email_id : null;
    if (!emailId) return NextResponse.json({ ok: true, skipped: "sin email_id" });
    const body = await fetchInboundBody(emailId);
    const fromRaw = typeof data.from === "string" ? data.from : "";
    const fm = /<([^>]+)>/.exec(fromRaw);
    const fromEmail = (fm ? fm[1] : fromRaw).trim();
    const fromName = fm
      ? fromRaw.replace(/<[^>]+>/, "").trim().replace(/^"|"$/g, "") || null
      : null;
    const toArr = data.to;
    const toEmail = Array.isArray(toArr)
      ? String(toArr[0] ?? "")
      : String(toArr ?? "");
    const subject = typeof data.subject === "string" ? data.subject : "";
    const text = typeof body?.text === "string" ? body.text : "";
    const html = typeof body?.html === "string" ? body.html : null;
    const threadKey = subject
      .toLowerCase()
      .replace(/^((re|fwd|fw):\s*)+/i, "")
      .trim();

    const res = await admin.from("inbound_emails").upsert(
      {
        resend_id: emailId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        snippet: text.slice(0, 140),
        text_body: text,
        html_body: html,
        thread_key: threadKey,
        folder: "inbox",
        attachments: Array.isArray(data.attachments) ? data.attachments : [],
        received_at: evt.created_at ?? new Date().toISOString(),
      },
      { onConflict: "resend_id" }
    );
    if (res.error) {
      console.error("[resend-webhook] inbound insert", res.error.message);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true, inbound: true });
  }

  // ── DELIVERY: eventos de envío saliente ───────────────────────────
  if (!type.startsWith("email.")) {
    return NextResponse.json({ ok: true, ignored: type });
  }
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

  // Resolver la campaña desde el envío ya registrado. El dashboard filtra
  // email_events / email_sends por campaign_id; sin esto los eventos del
  // webhook quedan huérfanos (campaign_id NULL) e invisibles para la UI,
  // congelando los conteos en el último backfill.
  const { data: sendRow } = await admin
    .from("email_sends")
    .select("campaign_id")
    .eq("resend_id", emailId)
    .maybeSingle();
  const campaignId = sendRow?.campaign_id ?? null;

  const ev = await admin.from("email_events").insert({
    resend_id: emailId,
    campaign_id: campaignId,
    event_type: shortType,
    occurred_at: occurredAt,
    payload: evt,
  });
  const snd = await admin.from("email_sends").upsert(
    {
      resend_id: emailId,
      campaign_id: campaignId,
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
