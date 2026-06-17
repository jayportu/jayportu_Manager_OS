"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMyProfile } from "@/lib/queries/dj-profile";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

const BUCKET = "avatars";

/**
 * Guarda la URL del avatar ya subido. El archivo se sube DIRECTO a Supabase
 * Storage desde el navegador (ver avatar-upload.tsx), no por este action — así
 * el byte de la imagen NUNCA pasa por el Server Action y se evita el tope de
 * 4.5 MB de request de Vercel (que rompía la subida de fotos grandes con el
 * críptico "An unexpected response was received from the server").
 *
 * Acá solo: validamos que la URL sea de nuestro bucket, borramos la foto
 * anterior (evita huérfanos) y actualizamos dj_profile.avatar_url.
 */
export async function setAvatarUrlAction(
  url: string
): Promise<Result<{ url: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    // Seguridad: solo aceptamos URLs públicas de NUESTRO bucket de avatars,
    // y que apunten a la carpeta del propio usuario.
    const path = extractStoragePath(url);
    if (!path || !path.startsWith(`${user.id}/`)) {
      return { ok: false, error: "URL de imagen inválida" };
    }

    // Borrar foto anterior si cambió (evita acumular archivos huérfanos)
    const { data: prev } = await supabase
      .from("dj_profile")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    if (prev?.avatar_url && prev.avatar_url !== url) {
      const oldPath = extractStoragePath(prev.avatar_url);
      if (oldPath) await supabase.storage.from(BUCKET).remove([oldPath]);
    }

    await updateMyProfile({ avatar_url: url });

    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dj");
    revalidateTag("public-djs");
    return { ok: true, data: { url } };
  } catch (e) {
    return err(e);
  }
}

/**
 * Borra la foto de perfil actual (Storage + columna).
 */
export async function deleteAvatarAction(): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const { data: profile } = await supabase
      .from("dj_profile")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.avatar_url) {
      const path = extractStoragePath(profile.avatar_url);
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }
    }

    await updateMyProfile({ avatar_url: "" });

    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dj");
    revalidateTag("public-djs");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Convierte la URL pública del Storage a su path interno (bucket-relative).
 * Ej: "https://xxx.supabase.co/storage/v1/object/public/avatars/USER/123.jpg"
 *     → "USER/123.jpg"
 */
function extractStoragePath(publicUrl: string): string | null {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/);
  return m ? m[1] : null;
}
