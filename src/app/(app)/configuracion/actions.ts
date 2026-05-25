"use server";

import { updateMyProfile } from "@/lib/queries/dj-profile";
import { revalidatePath } from "next/cache";
import type { DjProfileUpdate } from "@/types/database";

export async function saveProfileAction(
  patch: DjProfileUpdate
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateMyProfile(patch);
    // Revalidar el dashboard y la configuración para que muestre datos frescos
    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * Sprint 20 — Actualiza la configuración de marketplace del DJ:
 * visibilidad en /dj + disponibilidad para tocar.
 */
export async function updateAvailabilityAction(patch: {
  hidden_from_directory: boolean;
  available_from: string | null;
  available_until: string | null;
  available_note: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateMyProfile(patch as DjProfileUpdate);
    revalidatePath("/configuracion");
    revalidatePath("/dj");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}
