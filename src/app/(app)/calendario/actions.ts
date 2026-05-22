"use server";

import {
  createGCalEvent,
  listGCalEvents,
  deleteGCalEvent,
} from "@/lib/calendar/client";
import {
  upsertCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/queries/calendar-events";
import type { CalendarEventType } from "@/lib/calendar/types";
import { getMyGmailConnection } from "@/lib/queries/gmail";
import { revalidatePath } from "next/cache";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

/**
 * Crea evento en Google Calendar + lo guarda en DB local.
 */
export async function createEventAction(args: {
  type: CalendarEventType;
  title: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  contactId?: string | null;
}): Promise<Result<{ id: string }>> {
  try {
    const conn = await getMyGmailConnection();
    if (!conn) {
      return {
        ok: false,
        error:
          "Google no está conectado. Ve a /configuracion → Gmail y conecta tu cuenta.",
      };
    }

    const gcal = await createGCalEvent({
      title: args.title,
      description: args.description,
      location: args.location,
      startISO: args.startISO,
      endISO: args.endISO,
    });

    const row = await upsertCalendarEvent({
      google_event_id: gcal.id || null,
      type: args.type,
      title: args.title,
      description: args.description,
      location: args.location,
      start_at: args.startISO,
      end_at: args.endISO,
      contact_id: args.contactId || null,
      sync_state: "synced",
    });

    revalidatePath("/calendario");
    revalidatePath("/dashboard");
    if (args.contactId) revalidatePath(`/crm/${args.contactId}`);
    return { ok: true, data: { id: row.id } };
  } catch (e) {
    return err(e);
  }
}

/**
 * Sincroniza: trae eventos de Google (90 días pasados + 180 futuros)
 * y los inserta/actualiza en DB. Actualiza last_sync_at en gmail_connections.
 */
export async function syncEventsAction(): Promise<
  Result<{ pulled: number }>
> {
  try {
    const now = new Date();
    const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const future180 = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);

    const events = await listGCalEvents({
      timeMin: past90.toISOString(),
      timeMax: future180.toISOString(),
      maxResults: 250,
    });

    let pulled = 0;
    for (const ev of events) {
      if (!ev.id) continue;
      const start =
        ev.start.dateTime || (ev.start.date ? `${ev.start.date}T00:00:00Z` : null);
      const end =
        ev.end.dateTime || (ev.end.date ? `${ev.end.date}T23:59:59Z` : null);
      if (!start || !end) continue;

      // Inferir type del título si tiene keywords (best-effort)
      const titleLower = (ev.summary || "").toLowerCase();
      let type: CalendarEventType = "otro";
      if (/show|gig|jay\s*portu|set|@\s/i.test(titleLower)) type = "show";
      else if (/reuni|meeting|call/i.test(titleLower)) type = "reunion";
      else if (/follow|seguim/i.test(titleLower)) type = "follow_up";
      else if (/bloqueo|busy|unavailable/i.test(titleLower)) type = "bloqueo";
      else if (/contenido|reel|video|grabar/i.test(titleLower)) type = "contenido";

      await upsertCalendarEvent({
        google_event_id: ev.id,
        type,
        title: ev.summary || "(sin título)",
        description: ev.description || "",
        location: ev.location || "",
        start_at: start,
        end_at: end,
        all_day: !ev.start.dateTime,
        sync_state: "synced",
      });
      pulled++;
    }

    // Actualizar last_sync_at en gmail_connections
    try {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("gmail_connections")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("user_id", user.id);
      }
    } catch {
      // non-fatal
    }

    revalidatePath("/calendario");
    revalidatePath("/dashboard");
    return { ok: true, data: { pulled } };
  } catch (e) {
    return err(e);
  }
}

/**
 * Borra evento en Google Calendar + DB.
 */
export async function deleteEventAction(id: string): Promise<Result> {
  try {
    const row = await deleteCalendarEvent(id);
    if (row?.google_event_id) {
      try {
        await deleteGCalEvent(row.google_event_id);
      } catch (e) {
        // Si Google falla (ya borrado por otro lado), no bloqueamos
        console.error("deleteGCalEvent failed:", e);
      }
    }
    revalidatePath("/calendario");
    revalidatePath("/dashboard");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}
