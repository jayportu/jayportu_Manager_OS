"use server";

import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  addContactsToCampaign,
  updateCampaignContactStatus,
  removeCampaignContact,
} from "@/lib/queries/campaigns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  CampaignInsert,
  CampaignStatus,
  CampaignContactStatus,
} from "@/types/database";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

export async function createCampaignAction(
  input: CampaignInsert & { contact_ids?: string[] }
): Promise<Result<{ id: string }>> {
  try {
    const c = await createCampaign(input);
    if (input.contact_ids && input.contact_ids.length > 0) {
      await addContactsToCampaign(c.id, input.contact_ids);
    }
    revalidatePath("/campanas");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return err(e);
  }
}

export async function updateCampaignStatusAction(
  id: string,
  status: CampaignStatus
): Promise<Result> {
  try {
    await updateCampaign(id, {
      status,
      ended_at:
        status === "done" || status === "archived"
          ? new Date().toISOString()
          : null,
    });
    revalidatePath("/campanas");
    revalidatePath(`/campanas/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function deleteCampaignAction(id: string): Promise<void> {
  await deleteCampaign(id);
  revalidatePath("/campanas");
  redirect("/campanas");
}

export async function addContactsAction(
  campaignId: string,
  contactIds: string[]
): Promise<Result<{ inserted: number; skipped: number }>> {
  try {
    const r = await addContactsToCampaign(campaignId, contactIds);
    revalidatePath(`/campanas/${campaignId}`);
    return { ok: true, data: r };
  } catch (e) {
    return err(e);
  }
}

export async function updateCampaignContactStatusAction(
  id: string,
  campaignId: string,
  status: CampaignContactStatus
): Promise<Result> {
  try {
    await updateCampaignContactStatus(id, status);
    revalidatePath(`/campanas/${campaignId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function removeCampaignContactAction(
  id: string,
  campaignId: string
): Promise<Result> {
  try {
    await removeCampaignContact(id);
    revalidatePath(`/campanas/${campaignId}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}
