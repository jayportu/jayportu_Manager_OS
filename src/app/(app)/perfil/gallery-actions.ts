"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMyProfile } from "@/lib/queries/dj-profile";
import type { GalleryImage } from "@/types/database";

type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

const BUCKET = "avatars";
/** Tope de fotos en la galería (evita abuso de Storage y press kits eternos). */
const MAX_GALLERY = 40;
const MAX_FOLDER_LEN = 40;

/** "https://xxx.supabase.co/storage/v1/object/public/avatars/<path>" → "<path>". */
function extractStoragePath(publicUrl: string): string | null {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/avatars\/(.+)$/);
  return m ? m[1] : null;
}

function clean(s: string | null | undefined, max: number): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  return t.slice(0, max);
}

function revalidateGallery() {
  revalidatePath("/perfil");
  revalidatePath("/p/[slug]", "page");
}

async function getCurrentGallery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<GalleryImage[]> {
  const { data } = await supabase
    .from("dj_profile")
    .select("gallery")
    .eq("user_id", userId)
    .maybeSingle();
  const g = (data as { gallery?: unknown } | null)?.gallery;
  return Array.isArray(g) ? (g as GalleryImage[]) : [];
}

/**
 * Agrega una foto (ya subida a Storage por el navegador) a la galería.
 * Valida que la URL sea de NUESTRO bucket y de la carpeta del propio usuario.
 */
export async function addGalleryImageAction(
  url: string,
  folder?: string | null
): Promise<Result<{ gallery: GalleryImage[] }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const path = extractStoragePath(url);
    if (!path || !path.startsWith(`${user.id}/`)) {
      return { ok: false, error: "URL de imagen inválida" };
    }

    const current = await getCurrentGallery(supabase, user.id);
    if (current.length >= MAX_GALLERY) {
      return { ok: false, error: `Máximo ${MAX_GALLERY} fotos en la galería.` };
    }
    if (current.some((g) => g.url === url)) {
      return { ok: true, data: { gallery: current } }; // idempotente
    }

    const next: GalleryImage[] = [
      ...current,
      { url, folder: clean(folder, MAX_FOLDER_LEN), caption: null },
    ];
    await updateMyProfile({ gallery: next });
    revalidateGallery();
    revalidateTag("public-djs");
    return { ok: true, data: { gallery: next } };
  } catch (e) {
    return err(e);
  }
}

/** Quita una foto de la galería y borra el archivo de Storage (sin huérfanos). */
export async function removeGalleryImageAction(
  url: string
): Promise<Result<{ gallery: GalleryImage[] }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const current = await getCurrentGallery(supabase, user.id);
    const next = current.filter((g) => g.url !== url);
    await updateMyProfile({ gallery: next });

    // Borrar de Storage solo si la URL es nuestra y del propio usuario.
    const path = extractStoragePath(url);
    if (path && path.startsWith(`${user.id}/`)) {
      await supabase.storage.from(BUCKET).remove([path]);
    }

    revalidateGallery();
    revalidateTag("public-djs");
    return { ok: true, data: { gallery: next } };
  } catch (e) {
    return err(e);
  }
}

/** Renombra/asigna la carpeta de una foto (in-place por URL). */
export async function setGalleryFolderAction(
  url: string,
  folder: string | null
): Promise<Result<{ gallery: GalleryImage[] }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const current = await getCurrentGallery(supabase, user.id);
    const next = current.map((g) =>
      g.url === url ? { ...g, folder: clean(folder, MAX_FOLDER_LEN) } : g
    );
    await updateMyProfile({ gallery: next });
    revalidateGallery();
    revalidateTag("public-djs");
    return { ok: true, data: { gallery: next } };
  } catch (e) {
    return err(e);
  }
}
