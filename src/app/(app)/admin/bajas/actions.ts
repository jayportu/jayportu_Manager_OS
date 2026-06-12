"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/queries/admin";
import { addSuppression, removeSuppression } from "@/lib/queries/suppressions";

/** Alta manual de una baja (admin escribe un correo a mano). */
export async function addSuppressionAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const email = String(formData.get("email") || "").trim();
  const note = String(formData.get("note") || "").trim() || undefined;
  if (email.includes("@")) {
    await addSuppression(email, "manual", "admin", note);
  }
  revalidatePath("/admin/bajas");
}

/** Quita un correo de la lista (re-suscribir). */
export async function removeSuppressionAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const email = String(formData.get("email") || "").trim();
  if (email) await removeSuppression(email);
  revalidatePath("/admin/bajas");
}
