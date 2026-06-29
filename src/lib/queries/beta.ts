/**
 * Sprint 23.5 — Queries de beta_requests + feedback_reports + nps + analytics.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import {
  bugFixFollowupEmailHtml,
  bugFixFollowupEmailText,
  betaInviteEmailHtml,
  betaInviteEmailText,
} from "@/lib/email/templates";
import type {
  BetaRequest,
  BetaRequestInsert,
  BetaRequestStatus,
  FeedbackReport,
  FeedbackReportInsert,
  FeedbackReportWithUser,
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

/**
 * Aprueba una solicitud y manda el email de acceso por el MISMO path que el
 * botón admin "aprobar" (NO un update directo a DB → no se salta el correo).
 * Contexto server confiable: NO valida admin; el caller decide la autorización
 * (acción admin con assertAdmin, o auto-aprobación tras pasar el anti-spam de
 * /api/beta). Best-effort en el email: si falla, la solicitud queda aprobada y
 * el admin puede reenviar.
 */
export async function approveAndInviteBetaRequest(id: string): Promise<{
  ok: boolean;
  invite_token?: string;
  email?: string;
  artist_name?: string;
  email_sent: boolean;
  email_error?: string;
  error?: string;
}> {
  const updated = await updateBetaRequestStatus(id, "approved");
  if (!updated.invite_token) {
    return { ok: false, email_sent: false, error: "Token no se generó" };
  }

  let emailSent = false;
  let emailError: string | undefined;
  if (isResendConfigured()) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
    const inviteUrl = `${siteUrl}/login?invite=${updated.invite_token}`;
    const sendRes = await sendEmail({
      to: updated.email,
      subject: "Tu acceso a DROP — bienvenido a la beta",
      html: betaInviteEmailHtml({
        artistName: updated.artist_name,
        inviteUrl,
      }),
      text: betaInviteEmailText({
        artistName: updated.artist_name,
        inviteUrl,
      }),
      replyTo: process.env.RESEND_REPLY_TO || undefined,
    });
    if (sendRes.ok) {
      emailSent = true;
      await markInviteSent(id);
    } else {
      emailError = sendRes.error;
    }
  } else {
    emailError = "Resend no configurado";
  }

  return {
    ok: true,
    invite_token: updated.invite_token,
    email: updated.email,
    artist_name: updated.artist_name,
    email_sent: emailSent,
    email_error: emailError,
  };
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

/**
 * Convierte un valor legacy de screenshot_url (URL pública vieja) o un path
 * nuevo (interno tipo "USER/123.jpg") a un PATH normalizado para usar con
 * Supabase Storage.
 *
 * Antes del 2026-06-01, el endpoint /api/feedback guardaba la URL pública
 * tipo "https://xxx.supabase.co/storage/v1/object/public/feedback-screenshots
 * /USER/123.jpg". Ahora guarda sólo el path "USER/123.jpg". Esta función
 * maneja ambos casos para no romper registros viejos.
 */
function normalizeScreenshotPath(value: string): string | null {
  if (!value) return null;
  // Si parece URL pública vieja → extraer el path
  const m = value.match(
    /\/storage\/v1\/object\/public\/feedback-screenshots\/(.+)$/
  );
  if (m) return m[1];
  // Si ya es path interno (no incluye protocolo), retornarlo tal cual
  if (!value.startsWith("http")) return value;
  // URL con otro formato no esperado → no podemos generar signed URL
  return null;
}

/**
 * Lista todos los feedback con info del DJ que reportó (artist_name + email)
 * y signed URL de screenshot (60 min expiry). Solo admin.
 *
 * Hace JOIN manual con `dj_profile` y `auth.users` (N+1 por getUserById).
 *
 * Security: el bucket feedback-screenshots ahora es privado (2026-06-01).
 * En lugar de URLs públicas que cualquiera con el link puede ver, generamos
 * signed URLs que expiran en 1 hora y solo viajan al admin via esta query.
 */
export async function listFeedbackReports(opts?: {
  status?: FeedbackStatus;
  limit?: number;
}): Promise<FeedbackReportWithUser[]> {
  const admin = createAdminClient();
  let q = admin
    .from("feedback_reports")
    .select("*")
    .order("created_at", { ascending: false });
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) return [];
  const reports = (data || []) as FeedbackReport[];
  if (reports.length === 0) return [];

  // Batch fetch dj_profile.artist_name por todos los user_ids únicos
  const userIds = Array.from(new Set(reports.map((r) => r.user_id)));
  const { data: profiles } = await admin
    .from("dj_profile")
    .select("user_id, artist_name")
    .in("user_id", userIds);
  const profileMap = new Map<string, string>();
  for (const p of (profiles || []) as { user_id: string; artist_name: string }[]) {
    profileMap.set(p.user_id, p.artist_name);
  }

  // Fetch emails de auth.users (N queries — no hay batch en la API admin)
  const emailMap = new Map<string, string>();
  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const { data: u } = await admin.auth.admin.getUserById(uid);
        if (u?.user?.email) emailMap.set(uid, u.user.email);
      } catch {
        // ignorar — algún user borrado, no rompemos la lista
      }
    })
  );

  // Generar signed URLs para screenshots (paths nuevos + URLs viejas)
  const screenshotMap = new Map<string, string>();
  await Promise.all(
    reports.map(async (r) => {
      const path = normalizeScreenshotPath(r.screenshot_url);
      if (!path) return;
      try {
        const { data: signed } = await admin.storage
          .from("feedback-screenshots")
          .createSignedUrl(path, 3600); // 1 hora
        if (signed?.signedUrl) {
          screenshotMap.set(r.id, signed.signedUrl);
        }
      } catch {
        // ignorar — file borrado, bucket inaccesible, etc.
      }
    })
  );

  return reports.map((r) => ({
    ...r,
    // Sobrescribir screenshot_url con signed URL (o "" si no se pudo generar)
    screenshot_url: screenshotMap.get(r.id) || "",
    artist_name: profileMap.get(r.user_id) || null,
    email: emailMap.get(r.user_id) || null,
  }));
}

/**
 * Genera un "bug title" corto a partir de la descripción libre del feedback:
 * primer línea, recortada a 60 chars con ellipsis. Usada como subject del
 * email automático que se manda al marcar como "resuelto".
 */
function bugTitleFromDescription(desc: string): string {
  const first = (desc || "").split("\n")[0].trim();
  if (first.length === 0) return "el reporte";
  if (first.length <= 60) return first;
  return first.slice(0, 57).trim() + "...";
}

/**
 * Actualiza el status del feedback. Si el nuevo status es "resolved" y el
 * anterior NO era "resolved", manda un email automático al DJ que reportó
 * usando el template `bugFixFollowupEmailHtml` (cierra el loop: agradece +
 * confirma el fix + invita a verificar). El email no es bloqueante: si falla,
 * se loguea pero el status update se mantiene.
 *
 * `adminNotes` (opcional) se usa como `fixSummary` del email. Si está vacío,
 * se usa un texto default cordial.
 */
export async function updateFeedbackStatus(
  id: string,
  status: FeedbackStatus,
  adminNotes?: string
): Promise<FeedbackReport> {
  const admin = createAdminClient();

  // 1. Leer el reporte actual ANTES del update (necesitamos previous status
  //    + user_id + description + page_url para el email).
  const { data: prevData, error: prevErr } = await admin
    .from("feedback_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (prevErr || !prevData) {
    throw new Error(prevErr?.message || "Reporte no encontrado");
  }
  const previous = prevData as FeedbackReport;

  // 2. Aplicar el update.
  const patch: Record<string, unknown> = { status };
  if (adminNotes !== undefined) patch.admin_notes = adminNotes.slice(0, 1000);
  const { data, error } = await admin
    .from("feedback_reports")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  const updated = data as FeedbackReport;

  // 3. Si recién pasa a "resolved" (no si ya estaba), mandar email de cierre
  //    de loop. NO bloqueante: si falla email, el update sigue válido.
  const justResolved =
    status === "resolved" && previous.status !== "resolved";
  if (justResolved) {
    try {
      const { data: userResp } = await admin.auth.admin.getUserById(
        updated.user_id
      );
      const email = userResp?.user?.email;
      if (email) {
        const { data: profileData } = await admin
          .from("dj_profile")
          .select("artist_name")
          .eq("user_id", updated.user_id)
          .maybeSingle();
        const artistName =
          (profileData as { artist_name: string } | null)?.artist_name || "DJ";

        const bugTitle = bugTitleFromDescription(updated.description);
        const fixSummary =
          (adminNotes && adminNotes.trim().length > 0
            ? adminNotes.trim()
            : "Ya está arreglado. Gracias por reportar — tu feedback hace mejor a DROP. para todos.");
        const checkPoints = updated.page_url
          ? [{ label: "El lugar donde reportaste", url: updated.page_url }]
          : [];
        const dashboardUrl =
          (process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com") +
          "/dashboard";

        const html = bugFixFollowupEmailHtml({
          artistName,
          bugTitle,
          fixSummary,
          checkPoints,
          dashboardUrl,
        });
        const text = bugFixFollowupEmailText({
          artistName,
          bugTitle,
          fixSummary,
          checkPoints,
          dashboardUrl,
        });

        await sendEmail({
          to: email,
          subject: `Tu reporte: ${bugTitle}`,
          html,
          text,
          replyTo: process.env.RESEND_REPLY_TO || "hola@dropgigs.com",
        });
      }
    } catch (e) {
      // Log pero NO throw: el status update ya pasó. Si el email falla
      // (Resend caído, user borrado, etc), el admin puede reintentar
      // manualmente desde el script send_bug_fix_followup.mjs.
      console.error(
        "[updateFeedbackStatus] Fallo al mandar email de fix-followup:",
        e instanceof Error ? e.message : e
      );
    }
  }

  return updated;
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
