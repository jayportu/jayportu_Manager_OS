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

const BUCKET = "press-kits";

/**
 * Guarda la URL del PDF ya subido y actualiza dj_profile:
 *   press_kit_mode = 'pdf'
 *   press_kit_pdf_url
 *   press_kit_pdf_filename
 *   press_kit_pdf_size_bytes
 *
 * El PDF se sube DIRECTO a Supabase Storage desde el navegador (ver
 * press-kit-section.tsx), NO por este action — así el byte del archivo nunca
 * pasa por el Server Action y se evita el tope de 4.5 MB de request de Vercel
 * (que rompía PDFs grandes con el críptico "An unexpected response was
 * received from the server", mismo bug que tenía el avatar — PR #141).
 *
 * Acá solo: validamos que la URL sea de nuestro bucket y de la carpeta del
 * propio usuario, borramos el PDF anterior (evita huérfanos) y actualizamos
 * dj_profile.
 */
export async function setPressKitPdfUrlAction(
  url: string,
  filename: string,
  sizeBytes: number
): Promise<Result<{ url: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    // Seguridad: solo aceptamos URLs públicas de NUESTRO bucket de press-kits,
    // y que apunten a la carpeta del propio usuario.
    const path = extractStoragePath(url);
    if (!path || !path.startsWith(`${user.id}/`)) {
      return { ok: false, error: "URL de PDF inválida" };
    }

    // Borrar PDF anterior si cambió (evita acumular archivos huérfanos)
    const { data: prevProfile } = await supabase
      .from("dj_profile")
      .select("press_kit_pdf_url")
      .eq("user_id", user.id)
      .maybeSingle();

    if (prevProfile?.press_kit_pdf_url && prevProfile.press_kit_pdf_url !== url) {
      const oldPath = extractStoragePath(prevProfile.press_kit_pdf_url);
      if (oldPath) {
        await supabase.storage.from(BUCKET).remove([oldPath]);
      }
    }

    await updateMyProfile({
      press_kit_mode: "pdf",
      press_kit_pdf_url: url,
      press_kit_pdf_filename: (filename || "press-kit.pdf").slice(0, 200),
      press_kit_pdf_size_bytes: Math.max(0, Math.floor(Number(sizeBytes) || 0)),
    });

    revalidatePath("/configuracion");
    revalidatePath("/press-kit");
    revalidatePath("/p/[slug]", "page");
    return { ok: true, data: { url } };
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

/**
 * Convierte la URL pública del Storage a su path interno (bucket-relative).
 * Ej: "https://xxx.supabase.co/storage/v1/object/public/press-kits/USER/123-name.pdf"
 *     → "USER/123-name.pdf"
 */
function extractStoragePath(publicUrl: string): string | null {
  const m = publicUrl.match(/\/storage\/v1\/object\/public\/press-kits\/(.+)$/);
  return m ? m[1] : null;
}
