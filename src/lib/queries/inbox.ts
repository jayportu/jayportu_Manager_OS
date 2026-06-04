/**
 * Queries del inbox /admin/correo — correos entrantes a hola@dropgigs.com
 * (Resend Inbound → tabla inbound_emails). Service_role, salta RLS.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface InboundEmail {
  id: string;
  from_email: string;
  from_name: string | null;
  to_email: string;
  subject: string | null;
  snippet: string | null;
  text_body: string | null;
  html_body: string | null;
  thread_key: string | null;
  label: string | null;
  folder: string;
  starred: boolean;
  read_at: string | null;
  received_at: string;
}

export async function getInbox(folder = "inbox"): Promise<InboundEmail[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inbound_emails")
    .select(
      "id,from_email,from_name,to_email,subject,snippet,label,starred,read_at,folder,received_at"
    )
    .eq("folder", folder)
    .order("received_at", { ascending: false })
    .limit(100);
  return (data ?? []) as InboundEmail[];
}

export async function getInboundEmail(id: string): Promise<InboundEmail | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("inbound_emails")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as InboundEmail) ?? null;
}

export async function getUnreadCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("inbound_emails")
    .select("id", { count: "exact", head: true })
    .eq("folder", "inbox")
    .is("read_at", null);
  return count ?? 0;
}
