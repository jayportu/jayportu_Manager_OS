import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface AiOutputInsert {
  source: "ollama" | "chatgpt_manual" | "paste";
  model?: string;
  kind:
    | "summarize_contact"
    | "suggest_reply"
    | "refine_score"
    | "idea_content"
    | "classify_intent"
    | "extract_data"
    | "other";
  related_type?: string;
  related_id?: string | null;
  input_json?: Record<string, unknown>;
  output: string;
  saved_as?: string;
}

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function saveAiOutput(input: AiOutputInsert): Promise<string> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("ai_outputs")
    .insert({
      user_id: user.id,
      source: input.source,
      model: input.model || "",
      kind: input.kind,
      related_type: input.related_type || "",
      related_id: input.related_id || null,
      input_json: input.input_json || {},
      output: input.output,
      saved_as: input.saved_as || "",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function listAiOutputsForContact(
  contactId: string
): Promise<
  Array<{
    id: string;
    source: string;
    kind: string;
    output: string;
    model: string;
    created_at: string;
  }>
> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("ai_outputs")
    .select("id, source, kind, output, model, created_at")
    .eq("user_id", user.id)
    .eq("related_type", "contact")
    .eq("related_id", contactId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return data;
}
