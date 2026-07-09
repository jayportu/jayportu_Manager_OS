"use server";

/**
 * Server actions del editor de Link-in-bio (Fase 4).
 * Delegan en lib/queries/link-in-bio.ts y revalidan el editor + la pública.
 */
import {
  addLink,
  updateLink,
  deleteLink,
  setActive,
  moveLink,
} from "@/lib/queries/link-in-bio";
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

function revalidate() {
  revalidatePath("/link-in-bio");
  revalidatePath("/l/[slug]", "page");
}

export async function addLinkAction(label: string, url: string): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  if (!label.trim()) return { ok: false, error: "Ponle un nombre al link." };
  if (!url.trim()) return { ok: false, error: "Falta la URL." };
  try {
    await addLink(label, url);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function updateLinkAction(
  id: string,
  label: string,
  url: string
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  if (!label.trim() || !url.trim())
    return { ok: false, error: "Nombre y URL son obligatorios." };
  try {
    await updateLink(id, label, url);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function deleteLinkAction(id: string): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteLink(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function setActiveAction(
  id: string,
  active: boolean
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await setActive(id, active);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function moveLinkAction(
  id: string,
  dir: "up" | "down"
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await moveLink(id, dir);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}
