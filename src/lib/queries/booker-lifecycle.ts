import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { isSuppressed } from "@/lib/queries/suppressions";
import {
  bookerNoRespondeEmailHtml,
  bookerNoRespondeEmailText,
  bookerFavoritoEmailHtml,
  bookerFavoritoEmailText,
  bookerSinBookingEmailHtml,
  bookerSinBookingEmailText,
  bookerInactivo30dEmailHtml,
  bookerInactivo30dEmailText,
} from "@/lib/email/templates/booker";

/**
 * F4 · Crons de lifecycle del booker. Conecta las 4 plantillas huérfanas de
 * templates/booker.ts a un cron diario (patrón onboarding-nudge):
 *
 *  - noResponde   → al DJ: cotizó y el booker no responde hace 3 días.
 *  - favorito     → al DJ: alguien guardó su perfil (agrupado por DJ).
 *  - sinBooking   → al booker: 7 días sin enviar ninguna solicitud.
 *  - inactivo30d  → al booker: 30 días sin ninguna solicitud (win-back).
 *
 * DORMIDO por defecto: cada job corre en DRY-RUN (solo cuenta a quién mandaría)
 * hasta que su flag `BOOKER_*_ENABLED=true`. Además, si Resend no está
 * configurado nunca envía. `?dry=1` fuerza dry-run global.
 *
 * One-shot por columna (migración 0076): la marca se setea SOLO tras un envío
 * ok. Ventana de lookback para no blastear el backlog histórico al habilitar.
 * Respeta la lista de bajas (email_suppressions) además de la supresión de Resend.
 */

type Admin = ReturnType<typeof createAdminClient>;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
const DAY = 86_400_000;

// Umbrales de disparo (días desde el evento ancla).
const NO_RESPONSE_DAYS = 3;
const FAVORITO_WINDOW_DAYS = 3; // solo favoritos recientes (evita blast histórico)
const SIN_BOOKING_DAYS = 7;
const INACTIVO_DAYS = 30;
// Ventana: solo se considera el ancla en [now-(umbral+LOOKBACK), now-umbral].
const LOOKBACK_DAYS = 14;

const SEND_CAP = 60; // tope de envíos por job por corrida
const CANDIDATE_CHECK_CAP = 300; // tope de chequeos "¿tiene booking?" por corrida
const SEND_SLEEP_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface LifecycleJobResult {
  job: string;
  dryRun: boolean;
  candidates: number;
  sent: number;
  failed: number;
  skippedSuppressed: number;
  /** Muestra (hasta 10) de a quién se mandaría, para previsualizar en dry-run. */
  sample: string[];
}

function emptyResult(job: string, dryRun: boolean): LifecycleJobResult {
  return { job, dryRun, candidates: 0, sent: 0, failed: 0, skippedSuppressed: 0, sample: [] };
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long" }).format(
      new Date(iso)
    );
  } catch {
    return "hace unos días";
  }
}

/** Email de login (fuente de verdad en auth.users) para un user_id. */
async function authEmail(admin: Admin, userId: string): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

interface DjResolved {
  email: string;
  artistName: string;
  active: boolean;
}

/** Resuelve nombre artístico + estado + email del DJ. null si no hay email/perfil. */
async function resolveDj(admin: Admin, userId: string): Promise<DjResolved | null> {
  const { data } = await admin
    .from("dj_profile")
    .select("artist_name, account_status")
    .eq("user_id", userId)
    .maybeSingle();
  const p = data as { artist_name: string | null; account_status: string | null } | null;
  if (!p) return null;
  const email = await authEmail(admin, userId);
  if (!email) return null;
  return {
    email,
    artistName: p.artist_name || "DJ",
    active: (p.account_status ?? "active") === "active",
  };
}

/**
 * ¿El booker envió alguna solicitud? Primero por booker_user_id (link directo);
 * fallback por email para submissions anónimas aún no reclamadas
 * (claimBookingsByEmail las linkea al visitar el portal, pero cubrimos el borde).
 * Escapamos %/_ del email para que ilike no los trate como comodines.
 */
async function bookerHasSentBooking(
  admin: Admin,
  userId: string,
  email: string
): Promise<boolean> {
  const { count: c1 } = await admin
    .from("booking_form_submissions")
    .select("id", { count: "exact", head: true })
    .eq("booker_user_id", userId);
  if ((c1 ?? 0) > 0) return true;
  if (email && email.includes("@")) {
    const esc = email.replace(/([%_\\])/g, "\\$1");
    const { count: c2 } = await admin
      .from("booking_form_submissions")
      .select("id", { count: "exact", head: true })
      .is("booker_user_id", null)
      .ilike("email", esc);
    if ((c2 ?? 0) > 0) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// noResponde — al DJ, cotización sin responder hace 3 días
// ---------------------------------------------------------------------------
async function runNoResponde(admin: Admin, dryRun: boolean): Promise<LifecycleJobResult> {
  const now = Date.now();
  const high = new Date(now - NO_RESPONSE_DAYS * DAY).toISOString();
  const low = new Date(now - (NO_RESPONSE_DAYS + LOOKBACK_DAYS) * DAY).toISOString();
  const { data, error } = await admin
    .from("booking_form_submissions")
    .select("id, user_id, name, quoted_at")
    .eq("status", "cotizado")
    .is("counter_at", null)
    .is("no_response_email_sent_at", null)
    .lte("quoted_at", high)
    .gte("quoted_at", low)
    .order("quoted_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error("[booker-lifecycle] noResponde query:", error.message);
    return emptyResult("noResponde", dryRun);
  }
  const rows = (data ?? []) as {
    id: string;
    user_id: string;
    name: string | null;
    quoted_at: string | null;
  }[];
  const sample = rows.slice(0, 10).map((r) => r.name || r.user_id);
  if (dryRun) {
    return { job: "noResponde", dryRun: true, candidates: rows.length, sent: 0, failed: 0, skippedSuppressed: 0, sample };
  }

  let sent = 0,
    failed = 0,
    skippedSuppressed = 0;
  for (const r of rows.slice(0, SEND_CAP)) {
    const dj = await resolveDj(admin, r.user_id);
    if (!dj || !dj.active) continue;
    if (await isSuppressed(dj.email)) {
      skippedSuppressed++;
      continue;
    }
    const bookerName = r.name || "tu contacto";
    const sentAtLabel = r.quoted_at ? formatDate(r.quoted_at) : "hace unos días";
    const dashboardUrl = `${SITE}/press-kit/bookings`;
    const res = await sendEmail({
      to: dj.email,
      subject: `${bookerName} aún no respondió tu cotización`,
      html: bookerNoRespondeEmailHtml({ djArtistName: dj.artistName, bookerName, sentAtLabel, dashboardUrl }),
      text: bookerNoRespondeEmailText({ djArtistName: dj.artistName, bookerName, sentAtLabel, dashboardUrl }),
    });
    if (res.ok) {
      sent++;
      await admin
        .from("booking_form_submissions")
        .update({ no_response_email_sent_at: new Date().toISOString() })
        .eq("id", r.id);
      await admin.from("usage_events").insert({
        user_id: r.user_id,
        event: "booker_noresponde_email_sent",
        page: "/press-kit/bookings",
        metadata: { resend_email_id: res.id, submission_id: r.id },
      });
    } else {
      failed++;
      console.error("[booker-lifecycle] noResponde send:", r.id, res.error);
    }
    await sleep(SEND_SLEEP_MS);
  }
  return { job: "noResponde", dryRun: false, candidates: rows.length, sent, failed, skippedSuppressed, sample };
}

// ---------------------------------------------------------------------------
// favorito — al DJ, alguien guardó su perfil (agrupado por DJ)
// ---------------------------------------------------------------------------
async function runFavorito(admin: Admin, dryRun: boolean): Promise<LifecycleJobResult> {
  const now = Date.now();
  const low = new Date(now - FAVORITO_WINDOW_DAYS * DAY).toISOString();
  const { data, error } = await admin
    .from("booker_favorites")
    .select("id, dj_user_id, created_at")
    .is("favorito_email_sent_at", null)
    .gte("created_at", low)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) {
    console.error("[booker-lifecycle] favorito query:", error.message);
    return emptyResult("favorito", dryRun);
  }
  const rows = (data ?? []) as { id: string; dj_user_id: string }[];
  // Agrupar por DJ: un solo correo por DJ por corrida, marcando todas sus filas.
  const byDj = new Map<string, string[]>();
  for (const r of rows) {
    const arr = byDj.get(r.dj_user_id) ?? [];
    arr.push(r.id);
    byDj.set(r.dj_user_id, arr);
  }
  const djIds = [...byDj.keys()];
  const sample: string[] = [];
  for (const id of djIds.slice(0, 10)) {
    const { data: p } = await admin
      .from("dj_profile")
      .select("artist_name")
      .eq("user_id", id)
      .maybeSingle();
    sample.push((p as { artist_name: string | null } | null)?.artist_name || id);
  }
  if (dryRun) {
    return { job: "favorito", dryRun: true, candidates: djIds.length, sent: 0, failed: 0, skippedSuppressed: 0, sample };
  }

  let sent = 0,
    failed = 0,
    skippedSuppressed = 0;
  for (const djId of djIds.slice(0, SEND_CAP)) {
    const dj = await resolveDj(admin, djId);
    if (!dj || !dj.active) continue;
    if (await isSuppressed(dj.email)) {
      skippedSuppressed++;
      continue;
    }
    const profileUrl = `${SITE}/press-kit`;
    const res = await sendEmail({
      to: dj.email,
      subject: "Alguien guardó tu perfil",
      html: bookerFavoritoEmailHtml({ djArtistName: dj.artistName, profileUrl }),
      text: bookerFavoritoEmailText({ djArtistName: dj.artistName, profileUrl }),
    });
    if (res.ok) {
      sent++;
      const ids = byDj.get(djId) ?? [];
      await admin
        .from("booker_favorites")
        .update({ favorito_email_sent_at: new Date().toISOString() })
        .in("id", ids);
      await admin.from("usage_events").insert({
        user_id: djId,
        event: "booker_favorito_email_sent",
        page: "/press-kit",
        metadata: { resend_email_id: res.id, favorites: ids.length },
      });
    } else {
      failed++;
      console.error("[booker-lifecycle] favorito send:", djId, res.error);
    }
    await sleep(SEND_SLEEP_MS);
  }
  return { job: "favorito", dryRun: false, candidates: djIds.length, sent, failed, skippedSuppressed, sample };
}

// ---------------------------------------------------------------------------
// Retención al booker (sinBooking 7d / inactivo30d 30d) — mismo shape
// ---------------------------------------------------------------------------
interface RetentionConfig {
  job: string;
  afterDays: number;
  column: "sin_booking_email_sent_at" | "inactivo30d_email_sent_at";
  event: string;
  subject: string;
  html: (i: { bookerName: string; searchUrl: string }) => string;
  text: (i: { bookerName: string; searchUrl: string }) => string;
}

async function runBookerRetention(
  admin: Admin,
  dryRun: boolean,
  cfg: RetentionConfig
): Promise<LifecycleJobResult> {
  const now = Date.now();
  const high = new Date(now - cfg.afterDays * DAY).toISOString();
  const low = new Date(now - (cfg.afterDays + LOOKBACK_DAYS) * DAY).toISOString();
  const { data, error } = await admin
    .from("booker_accounts")
    .select("user_id, full_name, email")
    .eq("account_status", "active")
    .is(cfg.column, null)
    .lte("created_at", high)
    .gte("created_at", low)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    console.error(`[booker-lifecycle] ${cfg.job} query:`, error.message);
    return emptyResult(cfg.job, dryRun);
  }
  const rows = (data ?? []) as {
    user_id: string;
    full_name: string | null;
    email: string | null;
  }[];
  // Solo los que NO enviaron ningún booking.
  const eligible: typeof rows = [];
  for (const r of rows.slice(0, CANDIDATE_CHECK_CAP)) {
    const has = await bookerHasSentBooking(admin, r.user_id, r.email ?? "");
    if (!has) eligible.push(r);
  }
  const sample = eligible.slice(0, 10).map((r) => r.full_name || r.email || r.user_id);
  if (dryRun) {
    return { job: cfg.job, dryRun: true, candidates: eligible.length, sent: 0, failed: 0, skippedSuppressed: 0, sample };
  }

  const searchUrl = `${SITE}/booker/buscar`;
  let sent = 0,
    failed = 0,
    skippedSuppressed = 0;
  for (const r of eligible.slice(0, SEND_CAP)) {
    const email = (await authEmail(admin, r.user_id)) || r.email;
    if (!email) {
      failed++;
      continue;
    }
    if (await isSuppressed(email)) {
      skippedSuppressed++;
      continue;
    }
    const bookerName = r.full_name || "";
    const res = await sendEmail({
      to: email,
      subject: cfg.subject,
      html: cfg.html({ bookerName, searchUrl }),
      text: cfg.text({ bookerName, searchUrl }),
    });
    if (res.ok) {
      sent++;
      await admin
        .from("booker_accounts")
        .update({ [cfg.column]: new Date().toISOString() })
        .eq("user_id", r.user_id);
      await admin.from("usage_events").insert({
        user_id: r.user_id,
        event: cfg.event,
        page: "/booker/buscar",
        metadata: { resend_email_id: res.id },
      });
    } else {
      failed++;
      console.error(`[booker-lifecycle] ${cfg.job} send:`, r.user_id, res.error);
    }
    await sleep(SEND_SLEEP_MS);
  }
  return { job: cfg.job, dryRun: false, candidates: eligible.length, sent, failed, skippedSuppressed, sample };
}

export interface BookerLifecycleFlags {
  noResponde: boolean;
  favorito: boolean;
  sinBooking: boolean;
  inactivo30d: boolean;
}

export interface BookerLifecycleResult {
  resendConfigured: boolean;
  jobs: {
    noResponde: LifecycleJobResult;
    favorito: LifecycleJobResult;
    sinBooking: LifecycleJobResult;
    inactivo30d: LifecycleJobResult;
  };
}

/**
 * Orquesta los 4 jobs en serie (gentil con rate-limits y maxDuration). Cada job
 * corre en dry-run salvo que su flag esté ON, Resend esté configurado y no haya
 * ?dry=1 global.
 */
export async function runBookerLifecycle(opts: {
  flags: BookerLifecycleFlags;
  forceDry: boolean;
}): Promise<BookerLifecycleResult> {
  const admin = createAdminClient();
  const resendConfigured = isResendConfigured();
  const dry = (on: boolean) => opts.forceDry || !on || !resendConfigured;

  const noResponde = await runNoResponde(admin, dry(opts.flags.noResponde));
  const favorito = await runFavorito(admin, dry(opts.flags.favorito));
  const sinBooking = await runBookerRetention(admin, dry(opts.flags.sinBooking), {
    job: "sinBooking",
    afterDays: SIN_BOOKING_DAYS,
    column: "sin_booking_email_sent_at",
    event: "booker_sinbooking_email_sent",
    subject: "¿Todavía buscando DJ?",
    html: bookerSinBookingEmailHtml,
    text: bookerSinBookingEmailText,
  });
  const inactivo30d = await runBookerRetention(admin, dry(opts.flags.inactivo30d), {
    job: "inactivo30d",
    afterDays: INACTIVO_DAYS,
    column: "inactivo30d_email_sent_at",
    event: "booker_inactivo30d_email_sent",
    subject: "¿Sigues buscando DJ?",
    html: bookerInactivo30dEmailHtml,
    text: bookerInactivo30dEmailText,
  });

  return { resendConfigured, jobs: { noResponde, favorito, sinBooking, inactivo30d } };
}
