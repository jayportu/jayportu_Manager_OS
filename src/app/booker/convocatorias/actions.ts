"use server";

import {
  createGig,
  closeGig,
  markApplicationViewed,
  setApplicationStatus,
  type CreateGigInput,
} from "@/lib/queries/convocatorias";
import { notifyDjApplicationResult } from "@/lib/queries/convocatorias-notify";
import { assertBookerActive } from "@/lib/queries/booker-guard";
import { getCachedUser } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

/**
 * F0 — antes usaba `assertBetaActive`, que lee `dj_profile` y por tanto era un
 * NO-OP para bookers. Ahora exige cuenta de booker activa (y verificada donde
 * corresponde). Devuelve el mensaje de error en vez de lanzar, para encajar con
 * el tipo `Result`.
 */
async function guard(opts?: { requireVerified?: boolean }): Promise<string | null> {
  try {
    await assertBookerActive(opts);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "No autorizado.";
  }
}

export async function createGigAction(
  input: CreateGigInput
): Promise<Result & { id?: string }> {
  const blocked = await guard({ requireVerified: true });
  if (blocked) return { ok: false, error: blocked };
  if (!input.title?.trim()) return { ok: false, error: "Ponle un título a la convocatoria." };
  try {
    const id = await createGig(input);
    revalidatePath("/booker/convocatorias");
    return { ok: true, id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function closeGigAction(id: string): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await closeGig(id);
    revalidatePath("/booker/convocatorias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function markViewedAction(id: string): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await markApplicationViewed(id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function decideApplicationAction(
  applicationId: string,
  accept: boolean
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    const { djUserId, gigTitle } = await setApplicationStatus(
      applicationId,
      accept ? "accepted" : "rejected"
    );
    // Booker guarda al DJ en seguidos (idempotente) solo al aceptar.
    if (accept) {
      const { supabase, user } = await getCachedUser();
      if (user) {
        const { error } = await supabase
          .from("booker_favorites")
          .upsert(
            { user_id: user.id, dj_user_id: djUserId },
            { onConflict: "user_id,dj_user_id" }
          );
        if (error) console.error(error);
      }
    }
    await notifyDjApplicationResult(djUserId, gigTitle, accept);
    revalidatePath("/booker/convocatorias");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}
