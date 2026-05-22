"use server";

import { listTemplates, bumpTemplateUsage } from "@/lib/queries/templates";
import type { Template } from "@/types/database";

export async function fetchUserTemplatesAction(): Promise<Template[]> {
  try {
    return await listTemplates();
  } catch {
    return [];
  }
}

export async function bumpTemplateUsageAction(id: string): Promise<void> {
  try {
    await bumpTemplateUsage(id);
  } catch {
    /* non-fatal */
  }
}
