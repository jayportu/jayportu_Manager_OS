"use server";

import { updateMyProfile } from "@/lib/queries/dj-profile";
import { normalizeUrl } from "@/lib/format";
import {
  addRiderItem,
  updateRiderItem,
  deleteRiderItem,
} from "@/lib/queries/tech-rider";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { revalidatePath, revalidateTag } from "next/cache";
import type {
  DjProfileUpdate,
  TechRiderItem,
  TechRiderItemInsert,
} from "@/types/database";

export async function saveProfileAction(
  patch: DjProfileUpdate
): Promise<
  { ok: true; normalized: DjProfileUpdate } | { ok: false; error: string }
> {
  try {
    // Normalizar URLs de redes/web antes de guardar: trim + https:// si falta.
    // Sin esto, una URL pegada sin protocolo (ej. "soundcloud.com/foo") rompe
    // el embed del player y deja los links públicos como rutas relativas.
    const normalized: DjProfileUpdate = { ...patch };
    if (typeof normalized.instagram_url === "string")
      normalized.instagram_url = normalizeUrl(normalized.instagram_url);
    if (typeof normalized.soundcloud_url === "string")
      normalized.soundcloud_url = normalizeUrl(normalized.soundcloud_url);
    if (typeof normalized.youtube_url === "string")
      normalized.youtube_url = normalizeUrl(normalized.youtube_url);
    if (typeof normalized.spotify_url === "string")
      normalized.spotify_url = normalizeUrl(normalized.spotify_url);
    if (typeof normalized.website === "string")
      normalized.website = normalizeUrl(normalized.website);

    // Fee: descartar valores <= 0 (evita "Desde $0") y corregir rango invertido.
    if (typeof normalized.fee_min === "number" && normalized.fee_min <= 0)
      normalized.fee_min = null;
    if (typeof normalized.fee_max === "number" && normalized.fee_max <= 0)
      normalized.fee_max = null;
    if (
      typeof normalized.fee_min === "number" &&
      typeof normalized.fee_max === "number" &&
      normalized.fee_min > normalized.fee_max
    ) {
      const tmp = normalized.fee_min;
      normalized.fee_min = normalized.fee_max;
      normalized.fee_max = tmp;
    }

    await updateMyProfile(normalized);
    // Revalidar el dashboard, la config Y el press kit público para que
    // refleje cambios de bio, contacto, etc. instantáneamente.
    revalidatePath("/dashboard");
    revalidatePath("/configuracion");
    revalidatePath("/p/[slug]", "page");
    revalidatePath("/dj");
    revalidateTag("public-djs");
    // Devolvemos lo normalizado para que el form re-sincronice sus inputs
    // (URL con https:// agregado, fee corregido) en vez de seguir mostrando
    // lo que tipeó el usuario.
    return { ok: true, normalized };
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
    revalidateTag("public-djs");
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
 * Limpia los textareas legacy de tech rider (tech_rider_ideal,
 * tech_rider_alt, hospitality) cuando el DJ ya migró todo al editor
 * estructurado. Self-serve desde TechRiderSection.
 */
export async function clearLegacyTechRiderAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    await updateMyProfile({
      tech_rider_ideal: "",
      tech_rider_alt: "",
      hospitality: "",
    } as DjProfileUpdate);
    revalidatePath("/configuracion");
    revalidatePath("/perfil");
    revalidatePath("/p/[slug]", "page");
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
