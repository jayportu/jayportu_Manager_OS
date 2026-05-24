"use server";

import { saveAiOutput, type AiOutputInsert } from "@/lib/queries/ai-outputs";
import { updateContact } from "@/lib/queries/contacts";
import { revalidatePath } from "next/cache";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function saveAiOutputAction(
  input: AiOutputInsert & { contactId: string }
): Promise<Result<{ id: string }>> {
  try {
    const id = await saveAiOutput({
      ...input,
      related_type: "contact",
      related_id: input.contactId,
    });
    revalidatePath(`/crm/${input.contactId}`);
    return { ok: true, data: { id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error guardando IA output",
    };
  }
}

export async function appendToContactNotesAction(
  contactId: string,
  textToAppend: string
): Promise<Result> {
  try {
    // Leemos el contact via update (que lee + recalcula). En vez de eso,
    // simplemente concatenamos: hacemos un read y luego update.
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const { data: current, error: rErr } = await supabase
      .from("contacts")
      .select("notes")
      .eq("user_id", user.id)
      .eq("id", contactId)
      .single();
    if (rErr) throw new Error(rErr.message);

    const stamp = new Date().toLocaleString("es-CL", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Santiago",
    });
    const newNotes = `${current.notes || ""}\n\n--- IA · ${stamp} ---\n${textToAppend}`.trim();

    await updateContact(contactId, { notes: newNotes });
    revalidatePath(`/crm/${contactId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error",
    };
  }
}
