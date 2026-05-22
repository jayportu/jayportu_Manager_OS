import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Campaign,
  CampaignContact,
  CampaignContactStatus,
  CampaignInsert,
  CampaignStatus,
} from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

// ─── Campaigns ────────────────────────────────────────────────────────

export async function listCampaigns(opts?: {
  status?: CampaignStatus;
  limit?: number;
}): Promise<Campaign[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (error) return [];
  return data as Campaign[];
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Campaign;
}

export async function createCampaign(
  input: CampaignInsert
): Promise<Campaign> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      name: input.name,
      goal: input.goal || "",
      channel: input.channel || "whatsapp",
      status: input.status || "active",
      template_id: input.template_id || null,
      message_base: input.message_base || "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

export async function updateCampaign(
  id: string,
  patch: Partial<Omit<Campaign, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<Campaign> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("campaigns")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Campaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  await supabase
    .from("campaigns")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
}

// ─── Campaign contacts ────────────────────────────────────────────────

export async function listCampaignContacts(
  campaignId: string
): Promise<
  Array<
    CampaignContact & {
      contact_name: string;
      contact_type: string;
      contact_whatsapp: string;
      contact_email: string;
      contact_instagram: string;
      contact_score: number;
    }
  >
> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("campaign_contacts")
    .select(
      `*, contacts (name, type, whatsapp, email, instagram, score)`
    )
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return (
    data as Array<
      CampaignContact & {
        contacts:
          | {
              name: string;
              type: string;
              whatsapp: string;
              email: string;
              instagram: string;
              score: number;
            }
          | null;
      }
    >
  ).map((row) => ({
    ...row,
    contact_name: row.contacts?.name || "(borrado)",
    contact_type: row.contacts?.type || "",
    contact_whatsapp: row.contacts?.whatsapp || "",
    contact_email: row.contacts?.email || "",
    contact_instagram: row.contacts?.instagram || "",
    contact_score: row.contacts?.score || 0,
  }));
}

export async function addContactsToCampaign(
  campaignId: string,
  contactIds: string[]
): Promise<{ inserted: number; skipped: number }> {
  const { supabase, user } = await getUserOrThrow();
  if (contactIds.length === 0) return { inserted: 0, skipped: 0 };

  const payload = contactIds.map((cid) => ({
    user_id: user.id,
    campaign_id: campaignId,
    contact_id: cid,
    status: "pendiente" as const,
  }));

  const { data, error } = await supabase
    .from("campaign_contacts")
    .upsert(payload, {
      onConflict: "campaign_id,contact_id",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) throw new Error(error.message);
  const inserted = data?.length ?? 0;
  return { inserted, skipped: contactIds.length - inserted };
}

export async function updateCampaignContactStatus(
  id: string,
  status: CampaignContactStatus,
  extra?: {
    contacted_at?: string | null;
    response_at?: string | null;
    notes?: string;
    last_message?: string;
  }
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  // Auto-set timestamps según status
  const patch: Record<string, unknown> = { status, ...extra };
  if (status === "enviado" && !extra?.contacted_at) {
    patch.contacted_at = new Date().toISOString();
  }
  if (
    (status === "respondio" || status === "interesado") &&
    !extra?.response_at
  ) {
    patch.response_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("campaign_contacts")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeCampaignContact(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  await supabase
    .from("campaign_contacts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
}

export async function countCampaignContactsByStatus(
  campaignId: string
): Promise<Record<string, number>> {
  const { supabase, user } = await getUserOrThrow();
  const { data } = await supabase
    .from("campaign_contacts")
    .select("status")
    .eq("user_id", user.id)
    .eq("campaign_id", campaignId);
  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.status] = (counts[row.status] || 0) + 1;
  }
  return counts;
}
