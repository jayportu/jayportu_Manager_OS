import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  ContactStatus,
  ContactType,
} from "@/types/database";

export interface ListContactsParams {
  search?: string;
  type?: ContactType;
  status?: ContactStatus;
  city?: string;
  minScore?: number;
  orderBy?: "score" | "last_contact_at" | "created_at" | "name";
}

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listContacts(
  params: ListContactsParams = {}
): Promise<Contact[]> {
  const { supabase, user } = await getUserOrThrow();
  const orderBy = params.orderBy ?? "score";
  const ascending = orderBy === "name";

  let q = supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id);

  if (params.type) q = q.eq("type", params.type);
  if (params.status) q = q.eq("status", params.status);
  if (params.city) q = q.eq("city", params.city);
  if (typeof params.minScore === "number") q = q.gte("score", params.minScore);
  if (params.search && params.search.trim().length > 0) {
    const s = params.search.trim();
    q = q.or(
      `name.ilike.%${s}%,city.ilike.%${s}%,contact_person.ilike.%${s}%,music_style.ilike.%${s}%,notes.ilike.%${s}%`
    );
  }

  const { data, error } = await q
    .order(orderBy, { ascending, nullsFirst: false })
    .limit(500);

  if (error) {
    console.error("listContacts error:", error);
    return [];
  }
  return data as Contact[];
}

export async function getContact(id: string): Promise<Contact | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("getContact error:", error);
    return null;
  }
  return data as Contact;
}

export async function createContact(input: ContactInsert): Promise<Contact> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...input, user_id: user.id })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function updateContact(
  id: string,
  patch: ContactUpdate
): Promise<Contact> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

export async function deleteContact(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function bulkInsertContacts(
  rows: ContactInsert[]
): Promise<{ inserted: number }> {
  const { supabase, user } = await getUserOrThrow();
  if (rows.length === 0) return { inserted: 0 };
  const payload = rows.map((r) => ({ ...r, user_id: user.id }));
  const { data, error } = await supabase
    .from("contacts")
    .insert(payload)
    .select("id");
  if (error) throw new Error(error.message);
  return { inserted: data?.length ?? 0 };
}

export async function countContacts(): Promise<{
  total: number;
  avgScore: number;
  byStatus: Record<string, number>;
}> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .select("status, score")
    .eq("user_id", user.id);
  if (error || !data) return { total: 0, avgScore: 0, byStatus: {} };

  const total = data.length;
  const sumScore = data.reduce((acc, c) => acc + (c.score || 0), 0);
  const avgScore = total ? Math.round(sumScore / total) : 0;
  const byStatus: Record<string, number> = {};
  for (const c of data) {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }
  return { total, avgScore, byStatus };
}
