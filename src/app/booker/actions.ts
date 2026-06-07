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
    return { ok: false, error: "No puedes favoritarte a ti mismo" };
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
    revalidatePath("/booker/seguidos");
    revalidatePath("/dj");
    return { ok: true, favorited: false };
  } else {
    const { error } = await supabase.from("booker_favorites").insert({
      user_id: user.id,
      dj_user_id: djUserId,
    });
    if (error) return { ok: false, error: error.message };
    revalidatePath("/booker/seguidos");
    revalidatePath("/dj");
    return { ok: true, favorited: true };
  }
}

/**
 * m8 — marca UN pitch como visto (cuando el booker abre su press kit), en vez
 * de marcar TODOS en bulk al cargar la pestaña. Así el token del DJ se consume
 * solo cuando hubo lectura real de ese pitch. RLS limita al booker dueño.
 */
export async function markPitchViewedAction(
  pitchId: string
): Promise<{ ok: boolean }> {
  if (!pitchId) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await supabase
    .from("venue_pitches")
    .update({ viewed_at: new Date().toISOString() })
    .eq("id", pitchId)
    .eq("booker_user_id", user.id)
    .is("viewed_at", null);
  return { ok: true };
}

/**
 * Sprint RA-3 — Activa/desactiva los avisos por email sobre un DJ.
 *
 * Requiere que el booker YA tenga al DJ favoriteado (row en
 * booker_favorites). Si no existe, lo crea con notify_email=true
 * (favoritea + activa avisos en un solo gesto desde el toggle).
 *
 * Devuelve `notifyEmail` con el estado nuevo.
 */
export async function toggleFollowNotifyAction(
  djUserId: string
): Promise<{ ok: true; favorited: boolean; notifyEmail: boolean } | { ok: false; error: string }> {
  if (!djUserId || typeof djUserId !== "string") {
    return { ok: false, error: "djUserId inválido" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No hay sesión" };

  if (user.id === djUserId) {
    return { ok: false, error: "No puedes seguirte a ti mismo" };
  }

  const { data: existing } = await supabase
    .from("booker_favorites")
    .select("id, notify_email")
    .eq("user_id", user.id)
    .eq("dj_user_id", djUserId)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; notify_email: boolean };
    const newNotify = !row.notify_email;
    const { error } = await supabase
      .from("booker_favorites")
      .update({ notify_email: newNotify })
      .eq("id", row.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/booker/seguidos");
    return { ok: true, favorited: true, notifyEmail: newNotify };
  }

  // No tenía favorito → crea uno con notify_email=true (atajo de un click).
  const { error } = await supabase.from("booker_favorites").insert({
    user_id: user.id,
    dj_user_id: djUserId,
    notify_email: true,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/booker/seguidos");
  revalidatePath("/dj");
  return { ok: true, favorited: true, notifyEmail: true };
}
