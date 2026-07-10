"use server";

/**
 * Fase 7 — Soporte. Manda la consulta del DJ por email: uno al equipo
 * (reply-to = email del usuario) y una copia al usuario. Sin base de datos.
 */
import { sendEmail } from "@/lib/email/resend";
import { assertBetaActive } from "@/lib/queries/beta-guard";

type Result = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORT_TO = process.env.RESEND_REPLY_TO || "hola@dropgigs.com";

export interface SoporteFormValues {
  nombre: string;
  email: string;
  categoria: string;
  mensaje: string;
  imageDataUrl: string; // "" si no hay adjunto
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Parsea un data URL de imagen a attachment de Resend, con cap de tamaño. */
function parseAttachment(
  dataUrl: string
): { filename: string; content: string } | null {
  if (!dataUrl) return null;
  const m = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
  if (!m) return null;
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const base64 = m[2];
  // Cap ~800KB post-compresión (mismo criterio que el viejo widget).
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > 800 * 1024) return null;
  return { filename: `soporte-adjunto.${ext}`, content: base64 };
}

export async function enviarSoporte(values: SoporteFormValues): Promise<Result> {
  try {
    await assertBetaActive();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No autorizado." };
  }

  const nombre = values.nombre.trim().slice(0, 120) || "Usuario DROP";
  const email = values.email.trim();
  const categoria = values.categoria.trim().slice(0, 60) || "Otro";
  const mensaje = values.mensaje.trim().slice(0, 4000);

  if (!mensaje) return { ok: false, error: "Escribe tu mensaje primero." };
  if (!EMAIL_RE.test(email))
    return { ok: false, error: "Revisa tu email — no parece válido." };

  const attachment = parseAttachment(values.imageDataUrl);
  const attachments = attachment ? [attachment] : undefined;
  const bodyLines = esc(mensaje).replace(/\n/g, "<br/>");

  const teamHtml = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#0A0A0A">
      <h2 style="margin:0 0 12px">Nueva consulta de Soporte</h2>
      <p style="margin:0 0 4px"><b>De:</b> ${esc(nombre)} &lt;${esc(email)}&gt;</p>
      <p style="margin:0 0 4px"><b>Categoría:</b> ${esc(categoria)}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
      <p style="margin:0">${bodyLines}</p>
      ${attachment ? "<p style='margin:12px 0 0;color:#666'>(Con imagen adjunta)</p>" : ""}
    </div>`;

  const teamRes = await sendEmail({
    to: SUPPORT_TO,
    subject: `[Soporte · ${categoria}] ${nombre}`,
    html: teamHtml,
    replyTo: email,
    attachments,
  });
  if (!teamRes.ok) {
    return {
      ok: false,
      error: "No pudimos enviar tu mensaje. Escríbenos a hola@dropgigs.com.",
    };
  }

  // Copia de confirmación al usuario (no bloquea si falla).
  const userHtml = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#0A0A0A">
      <h2 style="margin:0 0 12px">Recibimos tu mensaje 🎧</h2>
      <p style="margin:0 0 12px">Gracias por escribirnos. Te responderemos a este correo lo antes posible. Esto fue lo que enviaste:</p>
      <p style="margin:0 0 4px"><b>Categoría:</b> ${esc(categoria)}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
      <p style="margin:0">${bodyLines}</p>
      <hr style="border:none;border-top:1px solid #ddd;margin:12px 0"/>
      <p style="margin:0;color:#666">DROP · dropgigs.com</p>
    </div>`;
  await sendEmail({
    to: email,
    subject: "Recibimos tu mensaje · DROP",
    html: userHtml,
  });

  return { ok: true };
}
