import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import type {
  DiscoveredLead,
  DiscoveredLeadInsert,
  LeadStatus,
} from "@/types/database";

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listLeads(opts?: {
  status?: LeadStatus;
  source?: string;
  limit?: number;
}): Promise<DiscoveredLead[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("discovered_leads")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.source) q = q.eq("source", opts.source);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (error) return [];
  return data as DiscoveredLead[];
}

export async function bulkUpsertLeads(
  rows: DiscoveredLeadInsert[]
): Promise<{ inserted: number; skipped: number }> {
  const { supabase, user } = await getUserOrThrow();
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  const payload = rows.map((r) => ({
    user_id: user.id,
    name: r.name,
    type: r.type || "otro",
    city: r.city || "",
    country: r.country || "Chile",
    address: r.address || "",
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    instagram: r.instagram || "",
    whatsapp: r.whatsapp || "",
    email: r.email || "",
    website: r.website || "",
    phone: r.phone || "",
    source: r.source || "manual_text",
    source_id: r.source_id || "",
    source_query: r.source_query || "",
    raw_data: r.raw_data || {},
    notes: r.notes || "",
  }));

  // Upsert por (user_id, source, source_id) — si ya existe, ignora
  const { data, error } = await supabase
    .from("discovered_leads")
    .upsert(payload, {
      onConflict: "user_id,source,source_id",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) throw new Error(error.message);
  const inserted = data?.length ?? 0;
  return { inserted, skipped: rows.length - inserted };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("discovered_leads")
    .update({ status })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getLead(id: string): Promise<DiscoveredLead | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("discovered_leads")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as DiscoveredLead;
}

export async function deleteLead(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("discovered_leads")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setPromotedContactId(
  leadId: string,
  contactId: string
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("discovered_leads")
    .update({ status: "added_to_crm", promoted_contact_id: contactId })
    .eq("user_id", user.id)
    .eq("id", leadId);
  // Antes se tragaba el error: si fallaba, el contacto quedaba creado pero el
  // lead sin marcar → al reintentar se duplicaba el contacto. Ahora lanza para
  // que el caller haga rollback.
  if (error) throw new Error(error.message);
}

export async function countLeadsByStatus(): Promise<Record<LeadStatus, number>> {
  const { supabase, user } = await getUserOrThrow();
  const { data } = await supabase
    .from("discovered_leads")
    .select("status")
    .eq("user_id", user.id);
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.status] = (counts[row.status] || 0) + 1;
  }
  return counts as Record<LeadStatus, number>;
}
