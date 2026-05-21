import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FollowUp, FollowUpInsert } from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listFollowUpsByContact(
  contactId: string
): Promise<FollowUp[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("user_id", user.id)
    .eq("contact_id", contactId)
    .order("due_at", { ascending: true });
  if (error) return [];
  return data as FollowUp[];
}

export async function listPendingFollowUps(
  limit = 30
): Promise<(FollowUp & { contact_name?: string; contact_type?: string })[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*, contacts(name, type)")
    .eq("user_id", user.id)
    .eq("done", false)
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("listPendingFollowUps error:", error);
    return [];
  }
  return (data || []).map(
    (
      r: FollowUp & { contacts?: { name?: string; type?: string } | null }
    ) => ({
      ...r,
      contact_name: r.contacts?.name,
      contact_type: r.contacts?.type,
    })
  );
}

export async function addFollowUp(input: FollowUpInsert): Promise<FollowUp> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("follow_ups")
    .insert({ ...input, user_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as FollowUp;
}

export async function completeFollowUp(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("follow_ups")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFollowUp(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}
