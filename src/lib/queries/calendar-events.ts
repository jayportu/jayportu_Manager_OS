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
  /** Sprint 19 — Tracking financiero */
  amount_clp?: number | null;
  payment_status?: import("@/lib/calendar/types").PaymentStatus;
  document_type?: import("@/lib/calendar/types").DocumentType;
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
    // Sprint 19 — Tracking financiero. NULL/undefined = no se setea (compatible
    // con events que vienen del sync de Google sin info financiera).
    ...(input.amount_clp !== undefined ? { amount_clp: input.amount_clp } : {}),
    ...(input.payment_status ? { payment_status: input.payment_status } : {}),
    ...(input.document_type ? { document_type: input.document_type } : {}),
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

/**
 * Sprint 19 — KPIs financieros del mes actual (Santiago tz).
 * Devuelve total facturado + pendiente + cantidad de gigs confirmados con monto.
 */
export interface FinanceKpis {
  monthLabel: string;
  totalCobrado: number;    // suma de amount_clp con payment_status='paid'
  totalPendiente: number;  // suma de amount_clp con payment_status='pending'
  totalGigs: number;       // gigs del mes con cualquier amount_clp
  gigsPagados: number;
  gigsPendientes: number;
  avgPerGig: number;       // total cobrado / gigs pagados
}

export async function getFinanceKpis(): Promise<FinanceKpis> {
  const { supabase, user } = await getUserOrThrow();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { data } = await supabase
    .from("calendar_events")
    .select("amount_clp, payment_status")
    .eq("user_id", user.id)
    .eq("type", "show")
    .gte("start_at", monthStart.toISOString())
    .lt("start_at", nextMonth.toISOString());

  const rows = (data || []) as Array<{
    amount_clp: number | null;
    payment_status: string;
  }>;
  const withAmount = rows.filter((r) => r.amount_clp && r.amount_clp > 0);
  const paid = withAmount.filter((r) => r.payment_status === "paid");
  const pending = withAmount.filter((r) => r.payment_status === "pending");
  const totalCobrado = paid.reduce((sum, r) => sum + (r.amount_clp ?? 0), 0);
  const totalPendiente = pending.reduce(
    (sum, r) => sum + (r.amount_clp ?? 0),
    0
  );

  return {
    monthLabel: monthStart.toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
      timeZone: "America/Santiago",
    }),
    totalCobrado,
    totalPendiente,
    totalGigs: withAmount.length,
    gigsPagados: paid.length,
    gigsPendientes: pending.length,
    avgPerGig: paid.length > 0 ? Math.round(totalCobrado / paid.length) : 0,
  };
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
