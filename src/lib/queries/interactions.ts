import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Interaction, InteractionInsert } from "@/types/database";

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
