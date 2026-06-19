/**
 * Capa 2 · Feature 3 — Disponibilidad por fecha.
 *
 * Días OCUPADOS de un DJ, derivados de sus calendar_events (gigs y bloqueos que
 * ya sincroniza desde Google Calendar). A diferencia de Ready to Play —que
 * obliga al DJ a marcar cada día a mano— acá la ocupación se deduce sola.
 *
 * Privacidad: NUNCA exponemos título/lugar/cliente del evento, solo el set de
 * fechas ocupadas (YYYY-MM-DD). Se lee con service_role porque calendar_events
 * tiene RLS owner-only y el press kit es público.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { santiagoDay, santiagoToday, santiagoToUtcISO } from "@/lib/tz";

/** Tipos de evento que ocupan al DJ (lo dejan no disponible ese día). */
const BUSY_TYPES = ["show", "bloqueo"] as const;

function nextDay(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Devuelve el set de días ocupados (YYYY-MM-DD, hora de Chile) de un DJ desde
 * hoy hasta `windowDays` adelante.
 *
 * - Eventos all-day (típicamente bloqueos/vacaciones): se expanden de start a
 *   end EXCLUSIVO (convención de Google Calendar para all-day).
 * - Eventos con hora (gigs): ocupan SOLO su día de inicio — así un set
 *   22:00–04:00 no bloquea por error la madrugada del día siguiente.
 */
export async function getPublicBusyDates(
  userId: string,
  windowDays = 92
): Promise<string[]> {
  const admin = createAdminClient();
  const today = santiagoToday();
  const fromUtc = santiagoToUtcISO(today, "00:00:00");
  const toUtc = santiagoToUtcISO(nextDay(addDays(today, windowDays)), "00:00:00");

  const { data, error } = await admin
    .from("calendar_events")
    .select("start_at, end_at, all_day, type") // sin título/lugar: privacidad
    .eq("user_id", userId)
    .in("type", BUSY_TYPES as unknown as string[])
    .gte("end_at", fromUtc)
    .lt("start_at", toUtc);

  if (error || !data) return [];

  const busy = new Set<string>();
  for (const ev of data as Array<{
    start_at: string;
    end_at: string;
    all_day: boolean;
  }>) {
    const startDay = santiagoDay(ev.start_at);
    if (ev.all_day) {
      const endExclusive = santiagoDay(ev.end_at);
      let d = startDay;
      if (d >= endExclusive) {
        busy.add(d); // all-day de un solo día (end == start)
      } else {
        while (d < endExclusive) {
          busy.add(d);
          d = nextDay(d);
        }
      }
    } else {
      busy.add(startDay); // gig: ocupa su noche (día de inicio)
    }
  }
  // Solo días desde hoy en adelante.
  return Array.from(busy).filter((d) => d >= today).sort();
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ¿El evento ocupa el día `date` (YYYY-MM-DD, Chile)? Misma regla que arriba. */
function eventCoversDate(
  ev: { start_at: string; end_at: string; all_day: boolean },
  date: string
): boolean {
  const startDay = santiagoDay(ev.start_at);
  if (ev.all_day) {
    const endExclusive = santiagoDay(ev.end_at);
    if (startDay >= endExclusive) return date === startDay;
    return date >= startDay && date < endExclusive;
  }
  return date === startDay; // gig con hora: ocupa su día de inicio
}

/**
 * De un conjunto de DJs, cuáles están OCUPADOS (gig/bloqueo) el día `date`.
 * Para el filtro de búsqueda "¿quién está libre el X?". Una sola query.
 */
export async function getBusyUserIdsOnDate(
  userIds: string[],
  date: string
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const admin = createAdminClient();
  const dayStart = santiagoToUtcISO(date, "00:00:00");
  const dayEnd = santiagoToUtcISO(nextDay(date), "00:00:00");

  const { data, error } = await admin
    .from("calendar_events")
    .select("user_id, start_at, end_at, all_day, type")
    .in("user_id", userIds)
    .in("type", BUSY_TYPES as unknown as string[])
    .lt("start_at", dayEnd)
    .gt("end_at", dayStart);

  if (error || !data) return new Set();

  const busy = new Set<string>();
  for (const ev of data as Array<{
    user_id: string;
    start_at: string;
    end_at: string;
    all_day: boolean;
  }>) {
    if (eventCoversDate(ev, date)) busy.add(ev.user_id);
  }
  return busy;
}
