"use server";

import {
  createGrowthCampaign,
  updateGrowthCampaign,
  deleteGrowthCampaign,
  createContentPost,
  getContentPost,
  updateContentPost,
  deleteContentPost,
  createSnapshot,
  deleteSnapshot,
} from "@/lib/queries/growth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { captureActionError } from "@/lib/observability";
import type {
  ContentPostInsert,
  GrowthCampaignInsert,
  GrowthCampaignStatus,
  PlatformSnapshotInsert,
  PostStatus,
  SocialPlatform,
} from "@/types/database";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
function err(e: unknown): { ok: false; error: string } {
  captureActionError(e, { module: "growth" });
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

// ─── Growth campaigns ────────────────────────────────────────────────

export async function createGrowthCampaignAction(
  input: GrowthCampaignInsert
): Promise<Result<{ id: string }>> {
  try {
    const c = await createGrowthCampaign(input);
    revalidatePath("/growth");
    revalidatePath("/growth/ads");
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return err(e);
  }
}

export async function updateGrowthCampaignStatusAction(
  id: string,
  status: GrowthCampaignStatus
): Promise<Result> {
  try {
    await updateGrowthCampaign(id, {
      status,
      ended_at:
        status === "done" || status === "archived"
          ? new Date().toISOString()
          : null,
    });
    revalidatePath("/growth");
    revalidatePath(`/growth/ads/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function deleteGrowthCampaignAction(id: string): Promise<void> {
  await deleteGrowthCampaign(id);
  revalidatePath("/growth");
  redirect("/growth/ads");
}

// ─── Content posts ───────────────────────────────────────────────────

export async function createContentPostAction(
  input: ContentPostInsert
): Promise<Result<{ id: string }>> {
  try {
    const p = await createContentPost(input);
    revalidatePath("/growth");
    revalidatePath("/growth/posts");
    if (input.growth_campaign_id) {
      revalidatePath(`/growth/ads/${input.growth_campaign_id}`);
    }
    return { ok: true, data: { id: p.id } };
  } catch (e) {
    return err(e);
  }
}

export async function duplicateContentPostAction(
  id: string
): Promise<Result<{ id: string }>> {
  try {
    const src = await getContentPost(id);
    if (!src) return { ok: false, error: "Post no encontrado." };
    // Clona el contenido y resetea estado/métricas/fechas → borrador nuevo,
    // listo para adaptar (ej. mismo post para otra plataforma).
    const copy = await createContentPost({
      platform: src.platform,
      format: src.format,
      title: `${src.title || "Post"} (copia)`,
      description: src.description,
      status: "borrador",
      hashtags: src.hashtags,
      notes: src.notes,
      growth_campaign_id: src.growth_campaign_id,
    });
    revalidatePath("/growth");
    revalidatePath("/growth/posts");
    return { ok: true, data: { id: copy.id } };
  } catch (e) {
    return err(e);
  }
}

export async function updateContentPostAction(
  id: string,
  patch: Partial<ContentPostInsert> & { status?: PostStatus }
): Promise<Result> {
  try {
    const updated = await updateContentPost(id, patch);
    revalidatePath("/growth");
    revalidatePath("/growth/posts");
    if (updated.growth_campaign_id) {
      revalidatePath(`/growth/ads/${updated.growth_campaign_id}`);
    }
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function deleteContentPostAction(id: string): Promise<Result> {
  try {
    await deleteContentPost(id);
    revalidatePath("/growth");
    revalidatePath("/growth/posts");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

// ─── Snapshots ───────────────────────────────────────────────────────

export async function saveSnapshotsAction(
  snapshots: PlatformSnapshotInsert[]
): Promise<Result<{ inserted: number }>> {
  try {
    let inserted = 0;
    for (const s of snapshots) {
      // Guardar si hay al menos un dato presente. OJO: 0 es un valor VÁLIDO
      // (cuenta nueva con 0 seguidores) — antes se descartaba silenciosamente.
      if (
        (s.followers === null || s.followers === undefined) &&
        (s.engagement_rate === null || s.engagement_rate === undefined)
      ) {
        continue;
      }
      await createSnapshot(s);
      inserted++;
    }
    revalidatePath("/growth");
    revalidatePath("/growth/snapshots");
    return { ok: true, data: { inserted } };
  } catch (e) {
    return err(e);
  }
}

export async function deleteSnapshotAction(id: string): Promise<Result> {
  try {
    await deleteSnapshot(id);
    revalidatePath("/growth/snapshots");
    revalidatePath("/growth");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

// Re-export para que el tipo SocialPlatform sea accesible donde lo usen
export type { SocialPlatform };
