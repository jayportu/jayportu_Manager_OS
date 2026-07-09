import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import type {
  FollowUp,
  FollowUpInsert,
  RecurrenceUnit,
} from "@/types/database";

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listFollowUpsByContact(
  contactId: string
): Promise<FollowUp[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("user_id", user.id)
    .eq("contact_id", contactId)
    .order("due_at", { ascending: true });
  if (error) return [];
  return data as FollowUp[];
}

export async function listPendingFollowUps(
  limit = 30
): Promise<(FollowUp & { contact_name?: string; contact_type?: string })[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*, contacts(name, type)")
    .eq("user_id", user.id)
    .eq("done", false)
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("listPendingFollowUps error:", error);
    return [];
  }
  return (data || []).map(
    (
      r: FollowUp & { contacts?: { name?: string; type?: string } | null }
    ) => ({
      ...r,
      contact_name: r.contacts?.name,
      contact_type: r.contacts?.type,
    })
  );
}

/**
 * Conteo REAL de follow-ups pendientes (sin el .limit de listPendingFollowUps).
 * Para KPIs/hero del dashboard, que deben mostrar el total, no el top-N.
 */
export async function countPendingFollowUps(): Promise<{
  total: number;
  overdue: number;
}> {
  const { supabase, user } = await getUserOrThrow();
  const nowIso = new Date().toISOString();
  const [totalRes, overdueRes] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("done", false),
    supabase
      .from("follow_ups")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("done", false)
      .lt("due_at", nowIso),
  ]);
  return { total: totalRes.count ?? 0, overdue: overdueRes.count ?? 0 };
}

/**
 * Sprint 19 — Lista todos los follow-ups recurrentes activos (head of series).
 * Devuelve una entrada por serie (el follow-up pendiente más próximo de cada una).
 */
export async function listRecurringFollowUps(): Promise<
  (FollowUp & { contact_name?: string })[]
> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*, contacts(name)")
    .eq("user_id", user.id)
    .eq("is_recurring", true)
    .eq("done", false)
    .order("due_at", { ascending: true });
  if (error) return [];
  return (data || []).map(
    (r: FollowUp & { contacts?: { name?: string } | null }) => ({
      ...r,
      contact_name: r.contacts?.name,
    })
  );
}

export async function addFollowUp(input: FollowUpInsert): Promise<FollowUp> {
  const { supabase, user } = await getUserOrThrow();

  // Si es recurrente y no se pasó series_id, lo generamos como el id mismo
  // después de insertar (UPDATE seguido del INSERT inicial).
  const isRecurring = input.is_recurring === true;
  if (isRecurring) {
    if (
      !input.recurrence_value ||
      input.recurrence_value <= 0 ||
      !input.recurrence_unit
    ) {
      throw new Error(
        "Para recurrente, recurrence_value > 0 y recurrence_unit son obligatorios."
      );
    }
  }

  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      contact_id: input.contact_id,
      due_at: input.due_at,
      note: input.note ?? "",
      priority: input.priority ?? "normal",
      is_recurring: isRecurring,
      recurrence_value: isRecurring ? input.recurrence_value : null,
      recurrence_unit: isRecurring ? input.recurrence_unit : null,
      recurrence_max: isRecurring ? input.recurrence_max ?? null : null,
      recurrence_index: 1,
      user_id: user.id,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  // Para serie nueva, recurrence_series_id = su propio id (autoreferencia).
  if (isRecurring) {
    await supabase
      .from("follow_ups")
      .update({ recurrence_series_id: data.id })
      .eq("id", data.id)
      .eq("user_id", user.id);
    return { ...(data as FollowUp), recurrence_series_id: data.id };
  }
  return data as FollowUp;
}

/**
 * Sprint 19 — Calcula la siguiente fecha sumando N unidades al actual.
 */
function nextDueDate(
  current: string,
  value: number,
  unit: RecurrenceUnit
): string {
  const d = new Date(current);
  if (unit === "days") d.setDate(d.getDate() + value);
  else if (unit === "weeks") d.setDate(d.getDate() + value * 7);
  else if (unit === "months") d.setMonth(d.getMonth() + value);
  return d.toISOString();
}

/**
 * Marca un follow-up como completado. Si es recurrente, crea automáticamente
 * el siguiente de la serie con due_at = due_at + recurrence_value*unit.
 *
 * Respeta recurrence_max (si está definido y se llegó al tope, no crea más).
 *
 * Devuelve el id del próximo follow-up creado (o null si no era recurrente
 * o si se llegó al tope).
 */
export async function completeFollowUp(id: string): Promise<string | null> {
  const { supabase, user } = await getUserOrThrow();

  // 1. Leer el follow-up actual para saber si es recurrente
  const { data: current, error: readErr } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (readErr) throw new Error(readErr.message);
  const fu = current as FollowUp;

  // 2. Marcarlo como hecho
  const { error: updateErr } = await supabase
    .from("follow_ups")
    .update({ done: true, done_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id);
  if (updateErr) throw new Error(updateErr.message);

  // 3. Si no era recurrente, listo
  if (
    !fu.is_recurring ||
    !fu.recurrence_value ||
    !fu.recurrence_unit
  ) {
    return null;
  }

  // 4. Verificar si llegamos al tope
  const nextIndex = fu.recurrence_index + 1;
  if (fu.recurrence_max !== null && nextIndex > fu.recurrence_max) {
    return null;
  }

  // 5. Crear el siguiente. Base = max(due_at, hoy): si el follow-up estaba
  // atrasado, el próximo se cuenta desde HOY (no desde la fecha vieja, que
  // dejaba el nuevo también en el pasado).
  const base =
    new Date(fu.due_at) < new Date() ? new Date().toISOString() : fu.due_at;
  const newDueAt = nextDueDate(
    base,
    fu.recurrence_value,
    fu.recurrence_unit
  );
  const seriesId = fu.recurrence_series_id ?? fu.id;
  const { data: next, error: nextErr } = await supabase
    .from("follow_ups")
    .insert({
      user_id: user.id,
      contact_id: fu.contact_id,
      due_at: newDueAt,
      note: fu.note,
      priority: fu.priority,
      is_recurring: true,
      recurrence_value: fu.recurrence_value,
      recurrence_unit: fu.recurrence_unit,
      recurrence_series_id: seriesId,
      recurrence_index: nextIndex,
      recurrence_max: fu.recurrence_max,
    })
    .select("id")
    .single();
  if (nextErr) throw new Error(nextErr.message);
  return next.id;
}

export async function deleteFollowUp(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Sprint 19 — Pausa una serie recurrente: marca is_recurring=false en el
 * follow-up pendiente actual (no se elimina, solo deja de auto-renovarse).
 */
export async function pauseRecurrence(seriesId: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("follow_ups")
    .update({ is_recurring: false })
    .eq("user_id", user.id)
    .eq("recurrence_series_id", seriesId)
    .eq("done", false);
  if (error) throw new Error(error.message);
}

/**
 * Sprint 19 — Elimina toda una serie (pendientes y cerrados).
 */
export async function deleteRecurrenceSeries(seriesId: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("follow_ups")
    .delete()
    .eq("user_id", user.id)
    .eq("recurrence_series_id", seriesId);
  if (error) throw new Error(error.message);
}
