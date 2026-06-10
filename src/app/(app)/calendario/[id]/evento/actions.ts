"use server";

import {
  setEventPublished,
  notifyFansOfEvent,
  setEventTicketUrl,
} from "@/lib/queries/events";
import { revalidatePath } from "next/cache";

export async function publishEventAction(
  eventId: string
): Promise<
  | { ok: true; token: string | null; notified: number }
  | { ok: false; error: string }
> {
  const res = await setEventPublished(eventId, true);
  if (!res.ok) return res;

  // Avisar a fans opt-in SOLO en la primera publicación (no al republicar).
  let notified = 0;
  if (res.firstPublish) {
    try {
      notified = await notifyFansOfEvent(eventId);
    } catch (e) {
      console.error("notifyFansOfEvent falló:", e);
    }
  }
  revalidatePath(`/calendario/${eventId}/evento`);
  return { ok: true, token: res.token, notified };
}

export async function unpublishEventAction(
  eventId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await setEventPublished(eventId, false);
  revalidatePath(`/calendario/${eventId}/evento`);
  if (!res.ok) return res;
  return { ok: true };
}

export async function setEventTicketUrlAction(
  eventId: string,
  url: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await setEventTicketUrl(eventId, url);
  revalidatePath(`/calendario/${eventId}/evento`);
  return res;
}
