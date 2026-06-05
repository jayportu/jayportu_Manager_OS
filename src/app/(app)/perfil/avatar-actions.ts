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

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (techo acordado para foto de perfil)
const BUCKET = "avatars";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Sube una foto de perfil al bucket Storage 'avatars' y actualiza
 * dj_profile.avatar_url. Si ya había una foto, borra la anterior para
 * no acumular archivos huérfanos.
 */
export async function uploadAvatarAction(
  formData: FormData
): Promise<Result<{ url: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return { ok: false, error: "Archivo no enviado" };
    }
    if (file.size === 0) {
      return { ok: false, error: "El archivo está vacío" };
    }
    if (file.size > MAX_BYTES) {
      return {
        ok: false,
        error: `La imagen supera 10 MB (es ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      };
    }
    if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
      return { ok: false, error: "Solo se permiten imágenes JPG, PNG o WebP" };
    }

    // Borrar foto anterior si existe (evita acumular archivos huérfanos)
    const { data: prevProfile } = await supabase
      .from("dj_profile")
      .select("avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prevProfile?.avatar_url) {
      const oldPath = extractStoragePath(prevProfile.avatar_url);
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Nombre único: {user_id}/{timestamp}.{ext}
    const ext = extFromType(file.type);
    const path = `${user.id}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        // 1 año: el path lleva timestamp único ({user_id}/{Date.now()}.ext),
        // así que la URL cambia en cada subida y no hay riesgo de servir una
        // foto vieja. Cachear largo deja que el CDN de Vercel y el navegador
        // eviten re-bajar el archivo → menos egress de Supabase.
        cacheControl: "31536000",
        upsert: false,
      });
    if (upErr) {
      return { ok: false, error: `Upload: ${upErr.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await updateMyProfile({ avatar_url: publicUrl });

    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dj");
    revalidateTag("public-djs");
    return { ok: true, data: { url: publicUrl } };
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

function extFromType(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/**
 * Convierte la URL pública del Storage a su path interno (bucket-relative).
 * Ej: "https://xxx.supabase.co/storage/v1/object/public/avatars/USER/123.jpg"
 *     → "USER/123.jpg"
 */
function extractStoragePath(publicUrl: string): string | null {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/);
  return m ? m[1] : null;
}
