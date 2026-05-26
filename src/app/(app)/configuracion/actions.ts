"use server";

import { updateMyProfile } from "@/lib/queries/dj-profile";
import {
  addRiderItem,
  updateRiderItem,
  deleteRiderItem,
} from "@/lib/queries/tech-rider";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { revalidatePath } from "next/cache";
import type {
  DjProfileUpdate,
  TechRiderItem,
  TechRiderItemInsert,
} from "@/types/database";

export async function saveProfileAction(
  patch: DjProfileUpdate
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateMyProfile(patch);
    // Revalidar el dashboard, la config Y el press kit público para que
    // refleje cambios de bio, contacto, etc. instantáneamente.
    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dj");
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
    revalidatePath("/p/[slug]", "page");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

// ════════════════════════════════════════════════════════════════════
// Sprint 21 — Tech rider items
// ════════════════════════════════════════════════════════════════════

export async function addRiderItemAction(
  input: TechRiderItemInsert
): Promise<{ ok: true; item: TechRiderItem } | { ok: false; error: string }> {
  try {
    await assertBetaActive();
    const item = await addRiderItem(input);
    revalidatePath("/configuracion");
    revalidatePath(`/p/[slug]`, "page");
    return { ok: true, item };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

export async function updateRiderItemAction(
  id: string,
  patch: Partial<TechRiderItemInsert>
): Promise<{ ok: true; item: TechRiderItem } | { ok: false; error: string }> {
  try {
    const item = await updateRiderItem(id, patch);
    revalidatePath("/configuracion");
    revalidatePath(`/p/[slug]`, "page");
    return { ok: true, item };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

export async function deleteRiderItemAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteRiderItem(id);
    revalidatePath("/configuracion");
    revalidatePath(`/p/[slug]`, "page");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}

/**
 * Sprint 21 — Actualiza la config del webhook de auto-post (Zapier/Make/n8n).
 */
export async function updateAutoPostAction(patch: {
  auto_post_enabled: boolean;
  auto_post_webhook_url: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await updateMyProfile(patch as DjProfileUpdate);
    revalidatePath("/configuracion");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, error };
  }
}
