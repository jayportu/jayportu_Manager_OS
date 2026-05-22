import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  CalendarEventRow,
  CalendarEventType,
} from "@/lib/calendar/types";

// Re-exportar para conveniencia de callers que ya importan de acá
export {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEventRow,
  type CalendarEventType,
} from "@/lib/calendar/types";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listMyEvents(opts?: {
  fromISO?: string;
  toISO?: string;
  type?: CalendarEventType;
  contactId?: string;
  limit?: number;
}): Promise<CalendarEventRow[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.fromISO) q = q.gte("start_at", opts.fromISO);
  if (opts?.toISO) q = q.lte("start_at", opts.toISO);
  if (opts?.type) q = q.eq("type", opts.type);
  if (opts?.contactId) q = q.eq("contact_id", opts.contactId);

  const { data, error } = await q
    .order("start_at", { ascending: true })
    .limit(opts?.limit ?? 200);
  if (error) return [];
  return data as CalendarEventRow[];
}

export async function upsertCalendarEvent(input: {
  google_event_id?: string | null;
  google_calendar_id?: string;
  type: CalendarEventType;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  all_day?: boolean;
  contact_id?: string | null;
  sync_state?: string;
}): Promise<CalendarEventRow> {
  const { supabase, user } = await getUserOrThrow();
  const payload = {
    user_id: user.id,
    google_event_id: input.google_event_id || null,
    google_calendar_id: input.google_calendar_id || "primary",
    type: input.type,
    title: input.title,
    description: input.description || "",
    location: input.location || "",
    start_at: input.start_at,
    end_at: input.end_at,
    all_day: input.all_day || false,
    contact_id: input.contact_id || null,
    sync_state: input.sync_state || "synced",
    last_synced_at: new Date().toISOString(),
  };

  if (input.google_event_id) {
    const { data, error } = await supabase
      .from("calendar_events")
      .upsert(payload, { onConflict: "user_id,google_event_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as CalendarEventRow;
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as CalendarEventRow;
}

export async function deleteCalendarEvent(id: string): Promise<{
  google_event_id: string | null;
} | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error: rErr } = await supabase
    .from("calendar_events")
    .select("google_event_id")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (rErr) return null;
  await supabase
    .from("calendar_events")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  return data as { google_event_id: string | null };
}
