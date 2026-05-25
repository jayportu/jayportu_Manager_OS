import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Contact,
  ContactInsert,
  ContactUpdate,
  ContactStatus,
  ContactType,
} from "@/types/database";
import { computeScoreForContact } from "@/lib/scoring";

/**
 * Calcula y aplica el score automático a un patch de contacto.
 * Se usa al insertar y al actualizar.
 * Si la operación es un update parcial, mezcla con el contacto existente.
 */
async function applyAutoScore(
  current: Partial<Contact> | null,
  patch: Partial<Contact>,
  interactionsCount = 0,
  lastInteractionAt: string | null = null
): Promise<{ score: number; score_reason: string }> {
  const merged = { ...current, ...patch };
  const breakdown = computeScoreForContact(
    {
      type: (merged.type as ContactType) || "otro",
      status: (merged.status as ContactStatus) || "nuevo",
      city: merged.city || "",
      country: merged.country || "",
      email: merged.email || "",
      whatsapp: merged.whatsapp || "",
      instagram: merged.instagram || "",
      website: merged.website || "",
      contact_person: merged.contact_person || "",
      music_style: merged.music_style || "",
    },
    interactionsCount,
    lastInteractionAt
  );
  return { score: breakdown.score, score_reason: breakdown.reason };
}

export interface ListContactsParams {
  search?: string;
  type?: ContactType;
  status?: ContactStatus;
  city?: string;
  minScore?: number;
  orderBy?: "score" | "last_contact_at" | "created_at" | "name";
  /** Sprint 19 — Filtrar contactos que tengan TODOS estos tags (AND). */
  tags?: string[];
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
  // Sprint 19 — Filtro AND por tags (contiene TODOS los tags pedidos)
  if (params.tags && params.tags.length > 0) {
    q = q.contains("tags", params.tags);
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

/**
 * Sprint 19 — Lista todos los tags únicos usados por el user en sus contactos,
 * con un conteo de cuántos contactos los tienen. Útil para autocomplete + filtros.
 */
export async function listAllUserTags(): Promise<
  { tag: string; count: number }[]
> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("contacts")
    .select("tags")
    .eq("user_id", user.id);
  if (error) return [];
  const counts = new Map<string, number>();
  for (const row of (data || []) as { tags: string[] | null }[]) {
    for (const t of row.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
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
  // Auto-score
  const { score, score_reason } = await applyAutoScore(null, input, 0, null);
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...input, score, score_reason, user_id: user.id })
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

  // Leer estado actual + interactions count para recalcular score
  const current = await getContact(id);
  if (!current) throw new Error("Contacto no encontrado");

  const { count } = await supabase
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("contact_id", id);

  const lastInteractionAt = current.last_contact_at;

  const { score, score_reason } = await applyAutoScore(
    current,
    patch,
    count ?? 0,
    lastInteractionAt
  );

  const { data, error } = await supabase
    .from("contacts")
    .update({ ...patch, score, score_reason })
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Contact;
}

/** Recalcula y guarda solo el score (usado después de addInteraction) */
export async function recomputeContactScore(contactId: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const current = await getContact(contactId);
  if (!current) return;
  const { count } = await supabase
    .from("interactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("contact_id", contactId);
  const { score, score_reason } = await applyAutoScore(
    current,
    {},
    count ?? 0,
    current.last_contact_at
  );
  await supabase
    .from("contacts")
    .update({ score, score_reason })
    .eq("user_id", user.id)
    .eq("id", contactId);
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
  // Auto-score cada fila
  const payload = await Promise.all(
    rows.map(async (r) => {
      const { score, score_reason } = await applyAutoScore(null, r, 0, null);
      return { ...r, score, score_reason, user_id: user.id };
    })
  );
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
