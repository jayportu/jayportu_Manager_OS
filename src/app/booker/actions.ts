"use server";

/**
 * Server actions del Booker.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Toggle favorite: si existe → delete; si no → insert. RLS garantiza
 * que el user solo puede tocar SUS propios favoritos.
 *
 * Retorna el nuevo estado (true = favoriteado, false = quitado).
 */
export async function toggleFavoriteAction(
  djUserId: string
): Promise<{ ok: true; favorited: boolean } | { ok: false; error: string }> {
  if (!djUserId || typeof djUserId !== "string") {
    return { ok: false, error: "djUserId inválido" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No hay sesión" };

  // No permitir que un DJ se favoritee a sí mismo (edge case)
  if (user.id === djUserId) {
    return { ok: false, error: "No te podés favoritar a vos mismo" };
  }

  // Buscar si ya existe
  const { data: existing } = await supabase
    .from("booker_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("dj_user_id", djUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("booker_favorites")
      .delete()
      .eq("id", (existing as { id: string }).id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/booker/favoritos");
    revalidatePath("/dj");
    return { ok: true, favorited: false };
  } else {
    const { error } = await supabase.from("booker_favorites").insert({
      user_id: user.id,
      dj_user_id: djUserId,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/booker/favoritos");
    revalidatePath("/dj");
    return { ok: true, favorited: true };
  }
}
