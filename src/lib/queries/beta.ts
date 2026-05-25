/**
 * Sprint 23.5 — Queries de beta_requests + feedback_reports + nps + analytics.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  BetaRequest,
  BetaRequestInsert,
  BetaRequestStatus,
  FeedbackReport,
  FeedbackReportInsert,
  FeedbackStatus,
  NpsResponse,
  NpsResponseInsert,
  UsageEventInsert,
} from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

// ════════════════════════════════════════════════════════════
// beta_requests
// ════════════════════════════════════════════════════════════

/**
 * Crea una solicitud de beta. Usa service_role porque el form es público
 * (sin sesión). Devuelve el id de la solicitud creada.
 */
export async function createBetaRequest(
  input: BetaRequestInsert
): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient();

  // Validación básica
  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Email inválido" };
  }
  if (!input.artist_name.trim()) {
    return { error: "Falta el nombre artístico" };
  }

  // Anti-duplicate: si ya hay solicitud con este email en últimos 30 días, rechazar
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await admin
    .from("beta_requests")
    .select("id, status")
    .ilike("email", email)
    .gte("created_at", thirtyDaysAgo)
    .limit(1);
  if (existing && existing.length > 0) {
    return { error: "Ya tienes una solicitud reciente con este email." };
  }

  const { data, error } = await admin
    .from("beta_requests")
    .insert({
      artist_name: input.artist_name.trim().slice(0, 120),
      email,
      instagram: (input.instagram || "")
        .trim()
        .replace(/^@/, "")
        .slice(0, 80),
      city: (input.city || "").trim().slice(0, 120),
      genres: (input.genres || []).slice(0, 8),
      motivation: (input.motivation || "").trim().slice(0, 600),
      ip_address: input.ip_address || null,
      user_agent: (input.user_agent || "").slice(0, 400),
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

/** Lista solicitudes — solo admin. */
export async function listBetaRequests(opts?: {
  status?: BetaRequestStatus;
  limit?: number;
}): Promise<BetaRequest[]> {
  const admin = createAdminClient();
  let q = admin
    .from("beta_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) return [];
  return data as BetaRequest[];
}

/** Cambia status de una solicitud — solo admin. */
export async function updateBetaRequestStatus(
  id: string,
  status: BetaRequestStatus,
  rejectReason?: string
): Promise<BetaRequest> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { status };
  const now = new Date().toISOString();
  if (status === "approved") {
    patch.approved_at = now;
    // generar invite_token random uuid v4 (compatible edge/node)
    patch.invite_token = crypto.randomUUID();
  } else if (status === "rejected") {
    patch.rejected_at = now;
    if (rejectReason) patch.reject_reason = rejectReason.slice(0, 300);
  }
  const { data, error } = await admin
    .from("beta_requests")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as BetaRequest;
}

/** Marca invite como enviado. */
export async function markInviteSent(id: string): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("beta_requests")
    .update({ invite_sent_at: new Date().toISOString() })
    .eq("id", id);
}

/** Encuentra solicitud por invite_token (para validar al signup). */
export async function findBetaRequestByToken(
  token: string
): Promise<BetaRequest | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("beta_requests")
    .select("*")
    .eq("invite_token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as BetaRequest;
}

// ════════════════════════════════════════════════════════════
// feedback_reports
// ════════════════════════════════════════════════════════════

export async function createFeedbackReport(
  input: FeedbackReportInsert
): Promise<FeedbackReport> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("feedback_reports")
    .insert({
      user_id: user.id,
      kind: input.kind,
      description: input.description.slice(0, 2000),
      page_url: (input.page_url || "").slice(0, 400),
      user_agent: (input.user_agent || "").slice(0, 400),
      screenshot_url: (input.screenshot_url || "").slice(0, 600),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as FeedbackReport;
}

/** Lista todos los feedback — solo admin. */
export async function listFeedbackReports(opts?: {
  status?: FeedbackStatus;
  limit?: number;
}): Promise<FeedbackReport[]> {
  const admin = createAdminClient();
  let q = admin
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) return [];
  return data as FeedbackReport[];
}

export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string
): Promise<FeedbackReport> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (adminNotes !== undefined) patch.admin_notes = adminNotes.slice(0, 1000);
  const { data, error } = await admin
    .from("feedback_reports")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as FeedbackReport;
}

// ════════════════════════════════════════════════════════════
// nps_responses
// ════════════════════════════════════════════════════════════

export async function createNpsResponse(
  input: NpsResponseInsert
): Promise<NpsResponse> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("nps_responses")
    .insert({
      user_id: user.id,
      milestone: input.milestone,
      score: input.score,
      comment: (input.comment || "").slice(0, 1000),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as NpsResponse;
}

/** Ver si el user ya respondió un hito específico. */
export async function hasUserAnsweredNps(
  userId: string,
  milestone: "day_7" | "day_15"
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("nps_responses")
    .select("id")
    .eq("user_id", userId)
    .eq("milestone", milestone)
    .maybeSingle();
  return !!data;
}

// ════════════════════════════════════════════════════════════
// usage_events
// ════════════════════════════════════════════════════════════

export async function logUsageEvent(input: UsageEventInsert): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  // Best-effort: no esperamos el resultado, no fallamos la request del user.
  const { error } = await supabase.from("usage_events").insert({
    user_id: user.id,
    event: input.event.slice(0, 80),
    page: (input.page || "").slice(0, 200),
    metadata: input.metadata || {},
  });
  if (error) {
    // Log pero no throw — el tracking no debe romper UX
    console.error("logUsageEvent error:", error);
  }
}
