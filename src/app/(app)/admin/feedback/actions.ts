"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import { updateFeedbackStatus } from "@/lib/queries/beta";
import type { FeedbackStatus } from "@/types/database";

export async function updateFeedbackAction(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await assertAdmin();
    await updateFeedbackStatus(id, status, adminNotes);
    revalidatePath("/admin/feedback");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
