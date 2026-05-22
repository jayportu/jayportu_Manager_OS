"use server";

import {
  associateThreadToContact,
  upsertThreadCache,
} from "@/lib/queries/gmail";
import { revalidatePath } from "next/cache";

export async function associateAction(args: {
  threadId: string;
  contactId: string | null;
  subject?: string;
  snippet?: string;
  fromHeader?: string;
  toHeader?: string;
  messagesCount?: number;
  lastMessageAt?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    // Parsear from: "Name <email>"
    const fromMatch = (args.fromHeader || "").match(
      /^"?([^"<]+?)"?\s*<([^>]+)>$/
    );
    const fromName = fromMatch?.[1]?.trim() || "";
    const fromEmail = fromMatch?.[2]?.trim() || args.fromHeader || "";

    await upsertThreadCache({
      thread_id: args.threadId,
      subject: args.subject,
      snippet: args.snippet,
      from_email: fromEmail,
      from_name: fromName,
      to_emails: args.toHeader,
      messages_count: args.messagesCount,
      last_message_at: args.lastMessageAt,
      contact_id: args.contactId,
    });
    if (args.contactId) {
      await associateThreadToContact(args.threadId, args.contactId);
    }
    revalidatePath(`/gmail/${args.threadId}`);
    revalidatePath("/gmail");
    if (args.contactId) revalidatePath(`/crm/${args.contactId}`);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error",
    };
  }
}
