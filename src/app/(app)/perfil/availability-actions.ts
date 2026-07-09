"use server";

import { updateMyProfile } from "@/lib/queries/dj-profile";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { revalidatePath, revalidateTag } from "next/cache";
import type { DjProfileUpdate } from "@/types/database";

/**
 * Actualiza la configuración de marketplace del DJ: visibilidad en /dj +
 * disponibilidad para tocar.
 *
 * Movida desde configuracion/actions.ts en la Fase 2 (la sección
 * "Disponibilidad" ahora vive dentro de /perfil).
 */
export async function updateAvailabilityAction(patch: {
  hidden_from_directory: boolean;
  available_from: string | null;
  available_until: string | null;
  available_note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertBetaActive(); // consistente con saveProfileAction (decisión 2026-06-11)
    await updateMyProfile(patch as DjProfileUpdate);
    revalidatePath("/perfil");
    revalidatePath("/dj");
    revalidatePath("/p/[slug]", "page");
    revalidateTag("public-djs");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}
