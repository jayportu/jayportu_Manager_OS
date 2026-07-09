import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import {
  santiagoMonthStartUtcISO,
  santiagoNextMonthStartUtcISO,
  santiagoToUtcISO,
} from "@/lib/tz";
import type {
  CalendarEventRow,
  CalendarEventType,
} from "@/lib/calendar/types";
import {
  groupCobros,
  projectFuture,
  type CobrosRange,
  type CobrosData,
} from "@/lib/calendar/cobros";

// Re-exportar para conveniencia de callers que ya importan de acá
export {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEventRow,
  type CalendarEventType,
} from "@/lib/calendar/types";

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
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
    .limit(opts?.limit ?? 1000); // 200 cortaba calendarios grandes en silencio
  if (error) {
    console.error("listMyEvents error:", error.message);
    return [];
  }
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

  // Bug fix 2026-06-02: Cuando el sync trae un evento que ya existe localmente,
  // NO pisar campos manejados por el usuario en DROP. (type, contact_id,
  // amount_clp, payment_status, document_type). Si re-inferiéramos `type` del
  // título de Google y lo upserteáramos completo, perderíamos la clasificación
  // manual de la usuaria — y con eso desaparecía el botón $ del row (gated
  // a `isShow`). Mismo riesgo con contact_id, que el sync nunca conoce.
  //
  // Estrategia: si existe la fila → UPDATE solo de campos "Google-sourced"
  // (title/description/location/fechas) + lo que el caller mande explícito.
  // Si no existe → INSERT con payload completo.
  if (input.google_event_id) {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("google_event_id", input.google_event_id)
      .maybeSingle();

    if (existing) {
      // UPDATE: solo campos que vienen de Google + los que el caller mande
      // explícito. Local-only fields (type, contact_id, amount_clp, etc.) NO
      // se tocan a menos que el caller los pase con valor distinto de undefined.
      const patch: Record<string, unknown> = {
        title: input.title,
        description: input.description || "",
        location: input.location || "",
        start_at: input.start_at,
        end_at: input.end_at,
        all_day: input.all_day || false,
        sync_state: input.sync_state || "synced",
        last_synced_at: new Date().toISOString(),
      };
      // Campos locales: solo si el caller los pasa explícito (no para sync).
      if (input.contact_id !== undefined) patch.contact_id = input.contact_id;
      if (input.amount_clp !== undefined) patch.amount_clp = input.amount_clp;
      if (input.payment_status !== undefined) patch.payment_status = input.payment_status;
      if (input.document_type !== undefined) patch.document_type = input.document_type;
      // `type` también es local — solo update si el caller lo pasa explícito.
      // OJO: la firma actual de la función exige type siempre, así que en la
      // práctica `input.type` siempre viene. Para no romper callers que asumen
      // que pueden cambiar type vía upsert, lo respetamos cuando viene. El
      // sync explícitamente NO debe pasarse por acá si quiere preservar type
      // local — usar updateEventAction para eso. (Ver syncEventsAction abajo,
      // que se ajusta para usar este path con el type recién inferido solo en
      // inserts.)
      // Decisión: NO pisar `type` en update desde sync; el sync se cambia para
      // pasarlo solo en inserts. Acá ignoramos `input.type` en updates.

      const { data, error } = await supabase
        .from("calendar_events")
        .update(patch)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as CalendarEventRow;
    }
  }

  // INSERT: payload completo (fila nueva, no hay nada que preservar).
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
    ...(input.amount_clp !== undefined ? { amount_clp: input.amount_clp } : {}),
    ...(input.payment_status ? { payment_status: input.payment_status } : {}),
    ...(input.document_type ? { document_type: input.document_type } : {}),
  };

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
  // Ventana del mes EN HORA DE CHILE (no UTC del server: cerca del cambio de
  // mes, gigs del último/primer día caían en el mes equivocado).
  const monthStartIso = santiagoMonthStartUtcISO();
  const nextMonthIso = santiagoNextMonthStartUtcISO();

  const { data } = await supabase
    .from("calendar_events")
    .select("amount_clp, payment_status")
    .eq("user_id", user.id)
    .gte("start_at", monthStartIso)
    .lt("start_at", nextMonthIso);

  const rows = (data || []) as Array<{
    amount_clp: number | null;
    payment_status: string;
  }>;
  const withAmount = rows.filter((r) => r.amount_clp && r.amount_clp > 0);
  const paid = withAmount.filter((r) => r.payment_status === "paid");
  // 'partial' cuenta como pendiente (antes desaparecía de todos los totales).
  const pending = withAmount.filter(
    (r) => r.payment_status === "pending" || r.payment_status === "partial"
  );
  const totalCobrado = paid.reduce((sum, r) => sum + (r.amount_clp ?? 0), 0);
  const totalPendiente = pending.reduce(
    (sum, r) => sum + (r.amount_clp ?? 0),
    0
  );

  return {
    monthLabel: new Date(monthStartIso).toLocaleDateString("es-CL", {
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

/**
 * Vista Cobros — seguimiento de pagos SIN límite de mes y SIN filtrar por
 * `type`: trae cualquier evento con plata (monto registrado o estado de pago
 * distinto de 'none') y lo agrupa en por-cobrar / cobrado.
 */
export async function getCobros(range: CobrosRange = "all"): Promise<CobrosData> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    // Con plata: monto > 0 O algún estado de cobro distinto de 'none'.
    .or("amount_clp.gt.0,payment_status.neq.none");

  if (range === "month") {
    q = q
      .gte("start_at", santiagoMonthStartUtcISO())
      .lt("start_at", santiagoNextMonthStartUtcISO());
  } else if (range === "year") {
    const year = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
    }).format(new Date());
    q = q
      .gte("start_at", santiagoToUtcISO(`${year}-01-01`, "00:00:00"))
      .lt("start_at", santiagoToUtcISO(`${Number(year) + 1}-01-01`, "00:00:00"));
  }

  const { data, error } = await q.limit(2000);
  if (error) {
    console.error("getCobros error:", error.message);
    return {
      porCobrar: [],
      cobrado: [],
      totalPorCobrar: 0,
      totalCobrado: 0,
      venuesDeben: 0,
      proyectado: { total: 0, count: 0, byMonth: [] },
    };
  }
  const rows = (data || []) as CalendarEventRow[];
  return { ...groupCobros(rows), proyectado: projectFuture(rows) };
}
