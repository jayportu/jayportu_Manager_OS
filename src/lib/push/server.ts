/**
 * Server-side wrapper de web-push.
 * NUNCA importar desde cliente — usa VAPID_PRIVATE_KEY.
 */
import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PushSubscriptionRow } from "@/types/database";

let vapidConfigured = false;

function configureVapid() {
  if (vapidConfigured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:hola@dropgigs.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys no configuradas (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)"
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface SendResult {
  total: number;
  sent: number;
  failed: number;
  errors: Array<{ endpoint: string; error: string }>;
}

/**
 * Envía un push a TODAS las subscripciones de un usuario.
 * Si una subscription devuelve 404/410, la borra automáticamente
 * (el navegador la canceló de su lado).
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<SendResult> {
  configureVapid();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(`No se pudieron leer subscriptions: ${error.message}`);

  const subs = (data || []) as PushSubscriptionRow[];
  const result: SendResult = {
    total: subs.length,
    sent: 0,
    failed: 0,
    errors: [],
  };

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/dashboard",
    tag: payload.tag,
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr
      );
      result.sent++;
      const { error: touchErr } = await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString(), last_error: null })
        .eq("id", sub.id);
      if (touchErr) console.error("[push] update last_used_at:", touchErr.message);
    } catch (e) {
      const statusCode =
        typeof e === "object" && e !== null && "statusCode" in e
          ? (e as { statusCode: number }).statusCode
          : null;
      const msg = e instanceof Error ? e.message : String(e);

      // 404/410 = subscription muerta → borrar
      if (statusCode === 404 || statusCode === 410) {
        const { error: delErr } = await admin
          .from("push_subscriptions")
          .delete()
          .eq("id", sub.id);
        if (delErr) console.error("[push] delete dead sub:", delErr.message);
      } else {
        const { error: errUpd } = await admin
          .from("push_subscriptions")
          .update({ last_error: msg.slice(0, 500) })
          .eq("id", sub.id);
        if (errUpd) console.error("[push] update last_error:", errUpd.message);
      }
      result.failed++;
      result.errors.push({ endpoint: sub.endpoint, error: msg });
    }
  }

  return result;
}
