"use server";

/**
 * Acciones del inbox /admin/correo. Responder envía vía Resend desde
 * hola@dropgigs.com (sendEmail usa RESEND_FROM_EMAIL). Todo gateado por admin.
 */
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/queries/admin";
import { sendEmail } from "@/lib/email/resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function archiveEmail(id: string): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("inbound_emails").update({ folder: "archived" }).eq("id", id);
  revalidatePath("/admin/correo");
}

export async function toggleStar(id: string, starred: boolean): Promise<void> {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("inbound_emails").update({ starred }).eq("id", id);
  revalidatePath("/admin/correo");
}

export interface ReplyState {
  ok: boolean;
  error?: string;
}

// Firma DROP. que se agrega a cada respuesta
const SIG_TEXT = "\n\n—\nDROP. Team\nhola@dropgigs.com · dropgigs.com";
const SIG_HTML =
  '<br/><br/><div style="color:#7A7670;font-size:13px;border-top:1px solid #E5E1D8;padding-top:8px;margin-top:10px;">DROP<span style="color:#FF5C00;">.</span> Team<br/>hola@dropgigs.com · <a href="https://dropgigs.com" style="color:#7A7670;">dropgigs.com</a></div>';

export async function sendReply(
  _prev: ReplyState | null,
  formData: FormData
): Promise<ReplyState> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "").trim();
  const subjectRaw = String(formData.get("subject") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!to || !text) return { ok: false, error: "Escribe un mensaje." };

  const subject = /^re:/i.test(subjectRaw) ? subjectRaw : `Re: ${subjectRaw}`;
  const bodyHtml = escapeHtml(text).replace(/\n/g, "<br/>");
  const html = `<div style="font-family:-apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.55; color:#0A0A0A;">${bodyHtml}${SIG_HTML}</div>`;

  const res = await sendEmail({
    to,
    subject,
    html,
    text: text + SIG_TEXT,
    replyTo: "hola@dropgigs.com",
  });
  if (!res.ok) {
    console.error("[inbox-reply] sendEmail falló", res.error);
    return { ok: false, error: res.error || "No se pudo enviar." };
  }

  const admin = createAdminClient();
  await admin
    .from("inbound_emails")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/correo");
  return { ok: true };
}
