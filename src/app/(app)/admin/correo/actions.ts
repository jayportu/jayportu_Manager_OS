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

// Firma DROP. oficial (tarjeta cream + franja naranja + wordmark + links)
const SIG_TEXT =
  "\n\n--\nEquipo DROP. · The DJ OS\n→ dropgigs.com\n→ hola@dropgigs.com\n→ @drop.gigs";
const SIG_HTML = `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;margin-top:20px;"><tr><td bgcolor="#F4EFE7" style="background-color:#F4EFE7;border:2px solid #0A0A0A;padding:0;"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr><td bgcolor="#FF5C00" width="6" style="background-color:#FF5C00;width:6px;font-size:1px;line-height:1px;">&nbsp;</td><td style="padding:18px 22px;font-family:'Helvetica Neue',Arial,sans-serif;color:#0A0A0A;"><table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;"><tr><td style="vertical-align:middle;padding-right:18px;"><img src="https://dropgigs.com/brand/wordmark-dark.png" alt="DROP." width="120" height="50" style="display:block;width:120px;height:50px;border:0;outline:none;text-decoration:none;"></td><td style="border-left:2px solid #0A0A0A;padding-left:18px;vertical-align:middle;"><div style="font-size:13px;font-weight:700;line-height:1.4;color:#0A0A0A;">Equipo DROP.</div><div style="font-size:12px;font-weight:400;line-height:1.4;color:#6B6B6B;padding-bottom:8px;">The DJ OS</div><div style="font-size:12px;line-height:1.9;color:#0A0A0A;"><a href="https://dropgigs.com" style="color:#0A0A0A;text-decoration:none;"><span style="color:#FF5C00;font-weight:700;">&rarr;</span>&nbsp;dropgigs.com</a><br><a href="mailto:hola@dropgigs.com" style="color:#0A0A0A;text-decoration:none;"><span style="color:#FF5C00;font-weight:700;">&rarr;</span>&nbsp;hola@dropgigs.com</a><br><a href="https://instagram.com/drop.gigs" style="color:#0A0A0A;text-decoration:none;"><span style="color:#FF5C00;font-weight:700;">&rarr;</span>&nbsp;@drop.gigs</a></div></td></tr></table></td></tr></table></td></tr></table>`;

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
