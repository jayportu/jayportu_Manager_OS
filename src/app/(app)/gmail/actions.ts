"use server";

import { sendEmail } from "@/lib/gmail/client";
import { addInteraction } from "@/lib/queries/interactions";
import { revalidatePath } from "next/cache";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmailAction(args: {
  to: string;
  subject: string;
  body: string;
  contactId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = args.to.trim();
  const subject = args.subject.trim();
  const body = args.body.trim();

  if (!EMAIL_RE.test(to)) {
    return { ok: false, error: "El correo del destinatario no es válido." };
  }
  if (!subject) return { ok: false, error: "Falta el asunto." };
  if (!body) return { ok: false, error: "El mensaje está vacío." };

  try {
    await sendEmail({ to, subject, bodyText: body });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    // Mensaje claro si el token perdió permisos / expiró.
    if (/no conectado|invalid_grant|401|403/.test(msg)) {
      return {
        ok: false,
        error:
          "No se pudo enviar: reconecta tu cuenta de Google desde esta página.",
      };
    }
    return { ok: false, error: `No se pudo enviar el correo. ${msg}` };
  }

  // Registrar el envío como interacción del CRM (alimenta score + timeline +
  // el panel "Correos enviados"). Si falla, no botamos el envío ya hecho.
  if (args.contactId) {
    try {
      await addInteraction({
        contact_id: args.contactId,
        channel: "email",
        direction: "out",
        note: subject,
      });
      revalidatePath(`/crm/${args.contactId}`);
    } catch (e) {
      console.error("sendEmailAction: addInteraction falló:", e);
    }
  }

  revalidatePath("/gmail");
  return { ok: true };
}
