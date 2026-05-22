"use server";

import {
  createGrowthCampaign,
  updateGrowthCampaign,
  deleteGrowthCampaign,
  createContentPost,
  updateContentPost,
  deleteContentPost,
  createSnapshot,
  deleteSnapshot,
} from "@/lib/queries/growth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

// ─── Growth campaigns ────────────────────────────────────────────────

export async function createGrowthCampaignAction(
  input: GrowthCampaignInsert
): Promise<Result<{ id: string }>> {
  try {
    const c = await createGrowthCampaign(input);
    revalidatePath("/growth");
    revalidatePath("/growth/campanas");
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
    revalidatePath(`/growth/campanas/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function deleteGrowthCampaignAction(id: string): Promise<void> {
  await deleteGrowthCampaign(id);
  revalidatePath("/growth");
  redirect("/growth/campanas");
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
      revalidatePath(`/growth/campanas/${input.growth_campaign_id}`);
    }
    return { ok: true, data: { id: p.id } };
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
      revalidatePath(`/growth/campanas/${updated.growth_campaign_id}`);
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
      // Solo guardar si hay al menos un dato numérico
      if (
        s.followers === null ||
        s.followers === undefined ||
        s.followers === 0
      ) {
        if (
          s.engagement_rate === null ||
          s.engagement_rate === undefined ||
          s.engagement_rate === 0
        ) {
          continue;
        }
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
