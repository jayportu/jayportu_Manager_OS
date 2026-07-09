/**
 * Sprint 21 — Queries del tech rider estructurado.
 */
import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  TechRiderItem,
  TechRiderItemInsert,
  RiderCategory,
} from "@/types/database";

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listMyRiderItems(): Promise<TechRiderItem[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tech_rider_items")
    .select("*")
    .eq("user_id", user.id)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data as TechRiderItem[];
}

/**
 * Lista los items del rider de un user específico (para vista pública
 * /p/[slug]). Usa service_role porque /p es accesible sin auth.
 */
export async function listPublicRiderItems(
  userId: string
): Promise<TechRiderItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("tech_rider_items")
    .select("*")
    .eq("user_id", userId)
    .eq("is_alternative", false)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data as TechRiderItem[];
}

export async function addRiderItem(
  input: TechRiderItemInsert
): Promise<TechRiderItem> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tech_rider_items")
    .insert({
      user_id: user.id,
      category: input.category,
      name: input.name,
      quantity: input.quantity ?? 1,
      alt_text: input.alt_text ?? "",
      note: input.note ?? "",
      sort_order: input.sort_order ?? 0,
      is_alternative: input.is_alternative ?? false,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as TechRiderItem;
}

export async function updateRiderItem(
  id: string,
  patch: Partial<TechRiderItemInsert>
): Promise<TechRiderItem> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tech_rider_items")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as TechRiderItem;
}

export async function deleteRiderItem(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("tech_rider_items")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Agrupa items por categoría (helper UI). */
export function groupItemsByCategory(
  items: TechRiderItem[]
): Record<RiderCategory, TechRiderItem[]> {
  const groups: Record<RiderCategory, TechRiderItem[]> = {
    reproduccion: [],
    mixer: [],
    monitores: [],
    power_cables: [],
    hospitality: [],
    otros: [],
  };
  for (const item of items) {
    if (!item.is_alternative) {
      groups[item.category].push(item);
    }
  }
  return groups;
}
