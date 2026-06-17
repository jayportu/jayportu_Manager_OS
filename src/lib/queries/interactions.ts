import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Interaction, InteractionInsert } from "@/types/database";
import { recomputeContactScore } from "./contacts";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listInteractionsByContact(
  contactId: string
): Promise<Interaction[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", user.id)
    .eq("contact_id", contactId)
    .order("happened_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("listInteractionsByContact error:", error);
    return [];
  }
  return data as Interaction[];
}

export async function addInteraction(
  input: InteractionInsert
): Promise<Interaction> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("interactions")
    .insert({ ...input, user_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Recalcular score del contacto (interactions count cambió)
  await recomputeContactScore(input.contact_id);

  return data as Interaction;
}

export async function deleteInteraction(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("interactions")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Correos salientes recientes (canal email, dirección out). Alimenta el panel
 * "Correos enviados" de la sección Correo. Cada envío desde el compositor
 * registra una interaction email/out sobre el contacto destinatario.
 */
export async function listSentEmails(
  limit = 8
): Promise<
  Array<{ id: string; note: string; happened_at: string; contact_name: string | null }>
> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("interactions")
    .select("id, note, happened_at, contacts(name)")
    .eq("user_id", user.id)
    .eq("channel", "email")
    .eq("direction", "out")
    .order("happened_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listSentEmails error:", error);
    return [];
  }
  type Row = {
    id: string;
    note: string;
    happened_at: string;
    contacts: { name: string | null } | { name: string | null }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => {
    const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    return {
      id: r.id,
      note: r.note,
      happened_at: r.happened_at,
      contact_name: c?.name ?? null,
    };
  });
}

export async function listRecentInteractions(
  limit = 20
): Promise<(Interaction & { contact_name?: string })[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("interactions")
    .select("*, contacts(name)")
    .eq("user_id", user.id)
    .order("happened_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("listRecentInteractions error:", error);
    return [];
  }
  return (data || []).map(
    (
      r: Interaction & { contacts?: { name?: string } | null }
    ) => ({
      ...r,
      contact_name: r.contacts?.name,
    })
  );
}
