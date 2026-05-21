/**
 * Server-only queries para la tabla dj_profile.
 * No importar desde Client Components — usar Server Actions o Route Handlers.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DjProfile, DjProfileUpdate } from "@/types/database";

/**
 * Devuelve el dj_profile del user autenticado.
 * El RLS de Postgres asegura que solo se pueda leer el propio.
 */
export async function getMyProfile(): Promise<DjProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("dj_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No row — el trigger debería haberlo creado. Race condition rara.
      return null;
    }
    console.error("getMyProfile error:", error);
    return null;
  }
  return data as DjProfile;
}

/**
 * Actualiza el dj_profile del user autenticado.
 * Devuelve el profile actualizado o lanza si falla.
 */
export async function updateMyProfile(
  patch: DjProfileUpdate
): Promise<DjProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("dj_profile")
    .update(patch)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("updateMyProfile error:", error);
    throw new Error(error.message);
  }
  return data as DjProfile;
}
