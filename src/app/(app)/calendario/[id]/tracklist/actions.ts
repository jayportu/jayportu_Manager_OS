"use server";

/**
 * Sprint 21 — Server actions del editor de tracklist.
 */

import { revalidatePath } from "next/cache";
import {
  addTrack,
  updateTrack,
  deleteTrack,
  bulkInsertTracks,
  recomputeTracklistKpis,
  deleteTracklist,
} from "@/lib/queries/tracklists";
import { createClient } from "@/lib/supabase/server";
import type {
  Tracklist,
  TracklistTrack,
  TracklistTrackInsert,
} from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function addTrackAction(
  input: TracklistTrackInsert
): Promise<{ ok: true; track: TracklistTrack } | { ok: false; error: string }> {
  try {
    const track = await addTrack(input);
    revalidatePath("/calendario/[id]/tracklist", "page");
    return { ok: true, track };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function updateTrackAction(
  id: string,
  patch: Partial<TracklistTrackInsert>
): Promise<{ ok: true; track: TracklistTrack } | { ok: false; error: string }> {
  try {
    const track = await updateTrack(id, patch);
    revalidatePath("/calendario/[id]/tracklist", "page");
    return { ok: true, track };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteTrackAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteTrack(id);
    revalidatePath("/calendario/[id]/tracklist", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function bulkImportTracksAction(
  tracklistId: string,
  tracks: Omit<TracklistTrackInsert, "tracklist_id">[]
): Promise<
  { ok: true; inserted: number } | { ok: false; error: string }
> {
  try {
    const { inserted } = await bulkInsertTracks(tracklistId, tracks);
    revalidatePath("/calendario/[id]/tracklist", "page");
    return { ok: true, inserted };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Reordena tracks de una tracklist actualizando sort_order de cada uno.
 * Recibe array de { id, sort_order } en el orden deseado.
 */
export async function reorderTracksAction(
  tracklistId: string,
  ordered: Array<{ id: string; sort_order: number }>
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await getUserOrThrow();
    // Actualizar uno por uno (poco probable que sean > 80)
    for (const t of ordered) {
      await supabase
        .from("tracklist_tracks")
        .update({ sort_order: t.sort_order })
        .eq("user_id", user.id)
        .eq("tracklist_id", tracklistId)
        .eq("id", t.id);
    }
    await recomputeTracklistKpis(tracklistId);
    revalidatePath("/calendario/[id]/tracklist", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

/**
 * Actualiza metadata de la tracklist (título, started_at, ended_at, notes).
 */
export async function updateTracklistMetaAction(
  id: string,
  patch: Partial<Pick<Tracklist, "title" | "started_at" | "ended_at" | "notes">>
): Promise<{ ok: true; tracklist: Tracklist } | { ok: false; error: string }> {
  try {
    const { supabase, user } = await getUserOrThrow();
    const { data, error } = await supabase
      .from("tracklists")
      .update(patch)
      .eq("user_id", user.id)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/calendario/[id]/tracklist", "page");
    return { ok: true, tracklist: data as Tracklist };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}

export async function deleteTracklistAction(
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await deleteTracklist(id);
    revalidatePath("/calendario/[id]/tracklist", "page");
    revalidatePath("/calendario");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error" };
  }
}
