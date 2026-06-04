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

export async function replyToEmail(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const to = String(formData.get("to") ?? "").trim();
  const subjectRaw = String(formData.get("subject") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  if (!to || !text) return;

  const subject = /^re:/i.test(subjectRaw) ? subjectRaw : `Re: ${subjectRaw}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Inter,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.55; color:#0A0A0A;">${escapeHtml(
    text
  ).replace(/\n/g, "<br/>")}</div>`;

  const res = await sendEmail({
    to,
    subject,
    html,
    text,
    replyTo: "hola@dropgigs.com",
  });
  if (!res.ok) {
    console.error("[inbox-reply] sendEmail falló", res.error);
    return;
  }

  const admin = createAdminClient();
  await admin
    .from("inbound_emails")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/correo");
}
