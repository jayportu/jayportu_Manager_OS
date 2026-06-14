import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GmailConnection, GmailThreadCache } from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function getMyGmailConnection(): Promise<GmailConnection | null> {
  const { user } = await getUserOrThrow();
  // Tokens OAuth → solo se leen con service_role (ver nota en lib/gmail/client.ts).
  // La aislación la da el .eq("user_id") explícito.
  const admin = createAdminClient();
  // maybeSingle: "sin fila" NO es error (antes .single() tiraba PGRST116 y se
  // trataba CUALQUIER error —RLS/red/multiple— como "no conectado", silencioso).
  const { data, error } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("getMyGmailConnection error:", error.message);
    return null;
  }
  return (data as GmailConnection) ?? null;
}

export async function listCachedThreads(opts?: {
  contactId?: string;
  limit?: number;
}): Promise<GmailThreadCache[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("gmail_threads_cache")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.contactId) q = q.eq("contact_id", opts.contactId);
  const { data, error } = await q
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(opts?.limit ?? 50);
  if (error) return [];
  return data as GmailThreadCache[];
}

export async function upsertThreadCache(input: {
  thread_id: string;
  subject?: string;
  snippet?: string;
  from_email?: string;
  from_name?: string;
  to_emails?: string;
  messages_count?: number;
  last_message_at?: string | null;
  contact_id?: string | null;
}): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("gmail_threads_cache")
    .upsert(
      {
        user_id: user.id,
        thread_id: input.thread_id,
        subject: input.subject || "",
        snippet: input.snippet || "",
        from_email: input.from_email || "",
        from_name: input.from_name || "",
        to_emails: input.to_emails || "",
        messages_count: input.messages_count || 0,
        last_message_at: input.last_message_at || null,
        contact_id: input.contact_id || null,
      },
      { onConflict: "user_id,thread_id" }
    );
  if (error) console.error("[gmail] upsertThreadCache:", error.message);
}

export async function associateThreadToContact(
  threadId: string,
  contactId: string | null
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("gmail_threads_cache")
    .update({ contact_id: contactId })
    .eq("user_id", user.id)
    .eq("thread_id", threadId);
  if (error) console.error("[gmail] associateThreadToContact:", error.message);
}
