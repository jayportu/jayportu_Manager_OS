"use server";

/**
 * Fase 3 booker — "⭐ me gustaría tocar acá".
 * El DJ logueado marca/desmarca interés sobre un lugar. RLS de
 * venue_interest deja insert/delete solo de filas propias (dj_user_id).
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result =
  | { ok: true; interested: boolean }
  | { ok: false; error: string };

export async function toggleVenueInterestAction(
  bookerUserId: string
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sesión expirada." };
  if (!bookerUserId) return { ok: false, error: "Lugar inválido." };
  if (bookerUserId === user.id)
    return { ok: false, error: "No puedes marcarte a ti mismo." };

  const { data: existing } = await supabase
    .from("venue_interest")
    .select("id")
    .eq("dj_user_id", user.id)
    .eq("booker_user_id", bookerUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("venue_interest")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/lugares");
    return { ok: true, interested: false };
  }

  const { error } = await supabase
    .from("venue_interest")
    .insert({ dj_user_id: user.id, booker_user_id: bookerUserId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/lugares");
  return { ok: true, interested: true };
}
