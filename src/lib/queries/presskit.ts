import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DjProfile,
  PresskitEvent,
  PresskitEventType,
  BookingSubmission,
  BookingStatus,
} from "@/types/database";

// ─── Public: leer profile por slug (sin auth) ─────────────────────────
export async function getProfileBySlug(slug: string): Promise<DjProfile | null> {
  // Usamos admin client porque la página es pública (sin sesión).
  // El RLS de dj_profile solo permite SELECT al owner, así que sin admin
  // un visitante anónimo no podría leer. Limitamos a campos seguros.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("dj_profile")
    .select("*")
    .eq("public_slug", slug)
    .single();
  if (error) {
    if (error.code !== "PGRST116") {
      console.error("getProfileBySlug error:", error);
    }
    return null;
  }
  return data as DjProfile;
}

// ─── Tracking (insert público vía admin) ──────────────────────────────
export async function trackEvent(input: {
  user_id: string;
  event: PresskitEventType;
  referrer?: string;
  user_agent?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("presskit_events").insert({
    user_id: input.user_id,
    event: input.event,
    referrer: input.referrer || "",
    user_agent: input.user_agent || "",
    country: input.country || "",
    metadata: input.metadata || {},
  });
  if (error) {
    console.error("trackEvent error:", error);
  }
}

// ─── Booking submissions ──────────────────────────────────────────────
export async function createBookingSubmission(input: {
  user_id: string;
  name: string;
  email?: string;
  phone?: string;
  event_type?: string;
  event_date?: string | null;
  venue?: string;
  message?: string;
  referrer?: string;
  user_agent?: string;
}): Promise<BookingSubmission | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_form_submissions")
    .insert({
      user_id: input.user_id,
      name: input.name,
      email: input.email || "",
      phone: input.phone || "",
      event_type: input.event_type || "",
      event_date: input.event_date || null,
      venue: input.venue || "",
      message: input.message || "",
      referrer: input.referrer || "",
      user_agent: input.user_agent || "",
    })
    .select("*")
    .single();
  if (error) {
    console.error("createBookingSubmission error:", error);
    return null;
  }
  return data as BookingSubmission;
}

// ─── Owner-only queries (con session) ────────────────────────────────
async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listEvents(days = 7): Promise<PresskitEvent[]> {
  const { supabase, user } = await getUserOrThrow();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("presskit_events")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return [];
  return data as PresskitEvent[];
}

export async function getEventsSummary(days = 7): Promise<{
  total: number;
  byEvent: Record<string, number>;
}> {
  const events = await listEvents(days);
  const byEvent: Record<string, number> = {};
  for (const e of events) {
    byEvent[e.event] = (byEvent[e.event] || 0) + 1;
  }
  return { total: events.length, byEvent };
}

export async function listBookings(
  status?: BookingStatus
): Promise<BookingSubmission[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("booking_form_submissions")
    .select("*")
    .eq("user_id", user.id);
  if (status) q = q.eq("status", status);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return [];
  return data as BookingSubmission[];
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("booking_form_submissions")
    .update({ status })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateProfileSlug(slug: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  // Sanitizar slug
  const clean = slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!clean) throw new Error("Slug inválido");

  const { error } = await supabase
    .from("dj_profile")
    .update({ public_slug: clean })
    .eq("user_id", user.id);
  if (error) {
    if (error.code === "23505") {
      throw new Error("Ese slug ya está en uso. Elige otro.");
    }
    throw new Error(error.message);
  }
}
