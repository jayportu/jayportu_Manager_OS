"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateMyProfile } from "@/lib/queries/dj-profile";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB (mismo límite del bucket, migración 0025)
const BUCKET = "press-kits";

/**
 * Sube un PDF al bucket Storage y actualiza dj_profile:
 *   press_kit_mode = 'pdf'
 *   press_kit_pdf_url
 *   press_kit_pdf_filename
 *   press_kit_pdf_size_bytes
 *
 * Si ya había un PDF, lo borra antes para no acumular archivos huérfanos.
 */
export async function uploadPressKitPdfAction(
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
        error: `El archivo supera 25 MB (es ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
      };
    }
    if (file.type !== "application/pdf") {
      return { ok: false, error: "Solo se permiten archivos PDF" };
    }

    // Borrar PDF anterior si existe (evita acumular archivos huérfanos)
    const { data: prevProfile } = await supabase
      .from("dj_profile")
      .select("press_kit_pdf_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prevProfile?.press_kit_pdf_url) {
      const oldPath = extractStoragePath(prevProfile.press_kit_pdf_url);
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    // Nombre único: {user_id}/{timestamp}-{sanitized}.pdf
    const safeName = sanitizeFilename(file.name);
    const path = `${user.id}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });
    if (upErr) {
      return { ok: false, error: `Upload: ${upErr.message}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(path);

    await updateMyProfile({
      press_kit_mode: "pdf",
      press_kit_pdf_url: publicUrl,
      press_kit_pdf_filename: file.name.slice(0, 200),
      press_kit_pdf_size_bytes: file.size,
    });

    revalidatePath("/configuracion");
    revalidatePath("/press-kit");
    revalidatePath("/p/[slug]", "page");
    return { ok: true, data: { url: publicUrl } };
  } catch (e) {
    return err(e);
  }
}

/**
 * Borra el PDF actual y vuelve el modo a 'generated' (página HTML).
 */
export async function deletePressKitPdfAction(): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const { data: profile } = await supabase
      .from("dj_profile")
      .select("press_kit_pdf_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.press_kit_pdf_url) {
      const path = extractStoragePath(profile.press_kit_pdf_url);
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }
    }

    await updateMyProfile({
      press_kit_mode: "generated",
      press_kit_pdf_url: "",
      press_kit_pdf_filename: "",
      press_kit_pdf_size_bytes: 0,
    });

    revalidatePath("/configuracion");
    revalidatePath("/press-kit");
    revalidatePath("/p/[slug]", "page");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

/**
 * Cambia entre modos sin borrar el PDF guardado. Útil para volver al
 * modo 'generated' sin perder el PDF, o reactivar el PDF si ya hay uno.
 */
export async function setPressKitModeAction(
  mode: "generated" | "pdf"
): Promise<Result> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    if (mode === "pdf") {
      // Validar que haya PDF subido
      const { data: profile } = await supabase
        .from("dj_profile")
        .select("press_kit_pdf_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile?.press_kit_pdf_url) {
        return {
          ok: false,
          error: "No tienes PDF subido. Sube uno antes de cambiar a modo PDF.",
        };
      }
    }

    await updateMyProfile({ press_kit_mode: mode });
    revalidatePath("/configuracion");
    revalidatePath("/press-kit");
    revalidatePath("/p/[slug]", "page");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  // Quitar acentos, espacios → -, solo a-z0-9-_.
  const noAccents = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  const cleaned = noAccents.replace(/[^a-z0-9._-]+/g, "-").replace(/-+/g, "-");
  // Asegurar extensión .pdf
  if (!cleaned.endsWith(".pdf")) {
    return `${cleaned}.pdf`;
  }
  return cleaned.slice(0, 100); // tope de 100 chars
}

/**
 * Convierte la URL pública del Storage a su path interno (bucket-relative).
 * Ej: "https://xxx.supabase.co/storage/v1/object/public/press-kits/USER/123-name.pdf"
 *     → "USER/123-name.pdf"
 */
function extractStoragePath(publicUrl: string): string | null {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/press-kits\/(.+)$/);
  return m ? m[1] : null;
}
