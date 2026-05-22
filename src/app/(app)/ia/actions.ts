"use server";

import { createClient } from "@/lib/supabase/server";
import { saveAiOutput } from "@/lib/queries/ai-outputs";
import { appendToContactNotesAction } from "../crm/[id]/ai-actions";
import type {
  Contact,
  Interaction,
  DjProfile,
} from "@/types/database";

export async function loadContactForStrategy(contactId: string): Promise<{
  contact: Contact | null;
  interactions: Interaction[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { contact: null, interactions: [] };

  const [{ data: contact }, { data: interactions }] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .eq("id", contactId)
      .single(),
    supabase
      .from("interactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("contact_id", contactId)
      .order("happened_at", { ascending: false })
      .limit(20),
  ]);

  return {
    contact: (contact as Contact) || null,
    interactions: (interactions as Interaction[]) || [],
  };
}

export async function saveStrategyResponseAction(args: {
  contactId: string;
  question: string;
  response: string;
  saveAsNote: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveAiOutput({
      source: "chatgpt_manual",
      model: "chatgpt-web",
      kind: "other",
      related_type: "contact",
      related_id: args.contactId,
      input_json: { question: args.question },
      output: args.response,
      saved_as: args.saveAsNote ? "note" : "",
    });

    if (args.saveAsNote) {
      const text = `Estrategia ChatGPT:\nPregunta: ${args.question}\n\n${args.response}`;
      const result = await appendToContactNotesAction(args.contactId, text);
      if (!result.ok) return { ok: false, error: result.error };
    }

    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error",
    };
  }
}

// Util para usar djProfile sin warning
export type { DjProfile };
