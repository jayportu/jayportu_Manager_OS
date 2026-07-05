"use server";

import {
  createContact,
  updateContact,
  deleteContact,
  bulkInsertContacts,
} from "@/lib/queries/contacts";
import { addInteraction } from "@/lib/queries/interactions";
import {
  addFollowUp,
  completeFollowUp,
  deleteFollowUp,
  pauseRecurrence,
  deleteRecurrenceSeries,
} from "@/lib/queries/follow-ups";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { captureActionError } from "@/lib/observability";
import type {
  ContactInsert,
  ContactUpdate,
  InteractionInsert,
  FollowUpInsert,
} from "@/types/database";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function errResult(e: unknown): { ok: false; error: string } {
  captureActionError(e, { module: "crm" });
  return { ok: false, error: e instanceof Error ? e.message : "Error desconocido" };
}

// ─── Contacts ─────────────────────────────────────────────────────────

export async function createContactAction(
  input: ContactInsert
): Promise<Result<{ id: string }>> {
  try {
    await assertBetaActive();
    const c = await createContact(input);
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: c.id } };
  } catch (e) {
    return errResult(e);
  }
}

export async function updateContactAction(
  id: string,
  patch: ContactUpdate
): Promise<Result> {
  try {
    await updateContact(id, patch);
    revalidatePath("/crm");
    revalidatePath(`/crm/${id}`);
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

export async function deleteContactAction(id: string): Promise<void> {
  await deleteContact(id);
  revalidatePath("/crm");
  revalidatePath("/dashboard");
  redirect("/crm");
}

// ─── CSV import ───────────────────────────────────────────────────────

export async function importContactsAction(
  rows: ContactInsert[]
): Promise<Result<{ inserted: number; skipped: number }>> {
  try {
    const r = await bulkInsertContacts(rows);
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: r };
  } catch (e) {
    return errResult(e);
  }
}

// ─── Interactions ─────────────────────────────────────────────────────

export async function addInteractionAction(
  input: InteractionInsert
): Promise<Result> {
  try {
    await addInteraction(input);
    revalidatePath(`/crm/${input.contact_id}`);
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

// ─── Follow-ups ───────────────────────────────────────────────────────

export async function addFollowUpAction(
  input: FollowUpInsert
): Promise<Result> {
  try {
    await addFollowUp(input);
    revalidatePath(`/crm/${input.contact_id}`);
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

export async function completeFollowUpAction(
  id: string,
  contactId: string
): Promise<Result> {
  try {
    await completeFollowUp(id);
    revalidatePath(`/crm/${contactId}`);
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

export async function deleteFollowUpAction(
  id: string,
  contactId: string
): Promise<Result> {
  try {
    await deleteFollowUp(id);
    revalidatePath(`/crm/${contactId}`);
    revalidatePath("/crm");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

// ─── Sprint 19 · Recurrencias ────────────────────────────────────────

export async function pauseRecurrenceAction(
  seriesId: string,
  contactId?: string
): Promise<Result> {
  try {
    await pauseRecurrence(seriesId);
    if (contactId) revalidatePath(`/crm/${contactId}`);
    revalidatePath("/crm/recurrentes");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}

export async function deleteRecurrenceSeriesAction(
  seriesId: string,
  contactId?: string
): Promise<Result> {
  try {
    await deleteRecurrenceSeries(seriesId);
    if (contactId) revalidatePath(`/crm/${contactId}`);
    revalidatePath("/crm/recurrentes");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return errResult(e);
  }
}
