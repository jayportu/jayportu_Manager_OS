import "server-only";

/**
 * Sprint 23.5 — Cliente Resend para mandar emails transaccionales.
 *
 * Setup:
 *   1) Crear cuenta en resend.com (gratis 100 emails/día sin tarjeta)
 *   2) Verificar el dominio (drop.dj o jayportu-manager-os.vercel.app)
 *   3) Setear RESEND_API_KEY + RESEND_FROM_EMAIL en Vercel
 *
 * Mientras no esté configurado, sendEmail() devuelve { ok: false } sin
 * romper la UX — el admin verá el botón "Copiar invite" y podrá enviar
 * manualmente como fallback.
 */

import { Resend } from "resend";

let cached: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (cached) return cached;
  cached = new Resend(key);
  return cached;
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.RESEND_FROM_EMAIL;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional reply-to (ej. tu email personal) */
  replyTo?: string;
}

export async function sendEmail(
  input: SendEmailInput
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: "RESEND_API_KEY no configurado" };
  }
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    return { ok: false, error: "RESEND_FROM_EMAIL no configurado" };
  }
  try {
    const res = await client.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
    });
    if (res.error) {
      return { ok: false, error: res.error.message };
    }
    if (!res.data?.id) {
      return { ok: false, error: "Resend no devolvió ID" };
    }
    return { ok: true, id: res.data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
