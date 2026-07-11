"use server";

import { applyToGig, withdrawApplication } from "@/lib/queries/convocatorias";
import { notifyBookerNewApplication } from "@/lib/queries/convocatorias-notify";
import { createContact } from "@/lib/queries/contacts";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

async function guard(): Promise<string | null> {
  try {
    await assertBetaActive();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "No autorizado.";
  }
}

export async function applyToGigAction(
  gigId: string,
  input: { message: string; availability: string }
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  if (!input.message.trim()) return { ok: false, error: "Escribe un mensaje de postulación." };
  try {
    const { bookerUserId, gigTitle, djName } = await applyToGig(gigId, input);
    // Notificar al booker (best-effort, no bloquea).
    await notifyBookerNewApplication(bookerUserId, gigTitle, djName);
    revalidatePath("/convocatorias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function withdrawApplicationAction(id: string): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await withdrawApplication(id);
    revalidatePath("/convocatorias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function addOrganizerToCrmAction(input: {
  name: string;
  city: string;
  country: string;
  gigTitle: string;
}): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  if (!input.name.trim()) return { ok: false, error: "Falta el nombre del organizador." };
  try {
    await createContact({
      name: input.name.trim(),
      type: "booker",
      city: input.city || "",
      country: input.country || "",
      notes: `Convocatoria aceptada: ${input.gigTitle}`,
    });
    revalidatePath("/convocatorias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}
