"use server";

import {
  createTemplate,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  seedTemplatesIfEmpty,
  bumpTemplateUsage,
} from "@/lib/queries/templates";
import { revalidatePath } from "next/cache";
import type { TemplateInsert, TemplateUpdate } from "@/types/database";
import { captureActionError } from "@/lib/observability";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  captureActionError(e, { module: "plantillas" });
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

export async function createTemplateAction(
  input: TemplateInsert
): Promise<Result<{ id: string }>> {
  try {
    const t = await createTemplate(input);
    revalidatePath("/plantillas");
    return { ok: true, data: { id: t.id } };
  } catch (e) {
    return err(e);
  }
}

export async function duplicateTemplateAction(
  id: string
): Promise<Result<{ id: string }>> {
  try {
    const src = await getTemplate(id);
    if (!src) return { ok: false, error: "Plantilla no encontrada." };
    const copy = await createTemplate({
      name: `${src.name} (copia)`,
      category: src.category,
      channel_suggested: src.channel_suggested,
      subject: src.subject,
      body: src.body,
    });
    revalidatePath("/plantillas");
    return { ok: true, data: { id: copy.id } };
  } catch (e) {
    return err(e);
  }
}

export async function updateTemplateAction(
  id: string,
  patch: TemplateUpdate
): Promise<Result> {
  try {
    await updateTemplate(id, patch);
    revalidatePath("/plantillas");
    revalidatePath(`/plantillas/${id}`);
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function deleteTemplateAction(id: string): Promise<Result> {
  try {
    await deleteTemplate(id);
    revalidatePath("/plantillas");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function seedTemplatesAction(): Promise<
  Result<{ inserted: number }>
> {
  try {
    const r = await seedTemplatesIfEmpty();
    revalidatePath("/plantillas");
    return { ok: true, data: r };
  } catch (e) {
    return err(e);
  }
}

export async function bumpTemplateUsageAction(id: string): Promise<void> {
  try {
    await bumpTemplateUsage(id);
    revalidatePath("/plantillas");
  } catch {
    /* non-fatal */
  }
}
