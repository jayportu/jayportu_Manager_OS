import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCompleteness, type CompletenessInput } from "@/lib/match/completeness";
import { sendEmail, isResendConfigured } from "@/lib/email/resend";
import { wrapEmail, ctaButton, escapeHtml } from "@/lib/email/templates";

/**
 * Nudge de onboarding incompleto: a un DJ que creó cuenta y empezó el perfil
 * pero NO lo terminó (`onboarding_completed_at` NULL), ~24h después le mandamos
 * UN recordatorio ("termina tu perfil"), con los ítems que le faltan (dinámico,
 * del score de completitud). One-shot: `onboarding_nudge_sent_at` evita re-enviar.
 *
 * Dormido por env: el cron corre en DRY-RUN (solo lista a quién mandaría) hasta
 * que `ONBOARDING_NUDGE_ENABLED=true`. Mandar correos reales no se dispara solo.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";
const NUDGE_AFTER_HOURS = 24;
const SEND_CAP = 100; // tope por corrida (a 600ms c/u entra en maxDuration 60s)

const PROFILE_COLS =
  "user_id, artist_name, bio_short, bio_long, genres, city, avatar_url, hero_image_url, " +
  "public_email, whatsapp, featured_sets, show_fee, fee_min, available_from, brands_worked, " +
  "aliases, record_label, instagram_url, soundcloud_url, youtube_url, spotify_url, website, created_at";

export interface NudgeCandidate {
  user_id: string;
  artist_name: string;
  created_at: string;
  percent: number;
  missing: string[];
}

/**
 * DJs elegibles para el nudge: onboarding sin terminar, sin nudge previo,
 * activos, y que empezaron hace ≥24h. NO trae emails (eso solo se resuelve al
 * enviar) → barato para previsualizar en /admin sin N llamadas a auth.
 */
export async function getOnboardingNudgeCandidates(): Promise<NudgeCandidate[]> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - NUDGE_AFTER_HOURS * 3600 * 1000).toISOString();
  const { data, error } = await admin
    .from("dj_profile")
    .select(PROFILE_COLS)
    .is("onboarding_completed_at", null)
    .is("onboarding_nudge_sent_at", null)
    .eq("account_status", "active")
    .lte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error || !data) {
    if (error) console.error("[onboarding-nudge] candidates query:", error.message);
    return [];
  }
  return (data as unknown as Record<string, unknown>[]).map((row) => {
    const c = computeCompleteness(row as CompletenessInput);
    return {
      user_id: row.user_id as string,
      artist_name: (row.artist_name as string) || "DJ",
      created_at: row.created_at as string,
      percent: c.percent,
      missing: c.missing,
    };
  });
}

function buildNudgeEmail(cand: NudgeCandidate): string {
  const name = escapeHtml(cand.artist_name);
  const items = cand.missing
    .slice(0, 5)
    .map(
      (m) =>
        `<li style="font-size:14px;line-height:1.6;color:#0A0A0A;">${escapeHtml(m)}</li>`
    )
    .join("");
  const list = items
    ? `<p style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#9A958B;margin:18px 0 4px;">Lo que te falta</p><ul style="margin:0 0 6px 18px;padding:0;">${items}</ul>`
    : "";
  return wrapEmail({
    title: "Quedaste a un paso",
    preheader: "Te toma 5 minutos terminar tu perfil.",
    content:
      `<p style="font-size:15px;line-height:1.55;">Hola ${name}, empezaste a armar tu perfil en DROP pero quedó a medias. Te toma <strong>5 minutos</strong> terminarlo — y sin perfil completo no apareces en el directorio ni los bookers pueden encontrarte.</p>` +
      list +
      `<p style="margin:24px 0;">${ctaButton("Terminar mi perfil", `${SITE}/welcome`)}</p>` +
      `<p style="font-size:13px;line-height:1.5;color:#6B675F;">¿Dudas? Respóndenos este correo, lo lee una persona de verdad.</p>`,
    footerReason:
      "Recibes este correo porque empezaste tu perfil en DROP y quedó sin terminar. Es un aviso único, no te mandaremos más.",
  });
}

export interface NudgeRunResult {
  dryRun: boolean;
  candidates: number;
  sent: number;
  failed: number;
  /** Muestra (hasta 20) para previsualizar a quién se mandaría. */
  sample: { artist_name: string; missing: string[] }[];
}

/**
 * Corre el nudge. En dryRun NO envía ni marca nada: solo cuenta y devuelve la
 * muestra. En modo real: por cada candidato resuelve su email (auth.users),
 * envía, marca `onboarding_nudge_sent_at` y loguea `usage_events`. Rate-limited.
 */
export async function runOnboardingNudge(opts: {
  dryRun: boolean;
}): Promise<NudgeRunResult> {
  const candidates = await getOnboardingNudgeCandidates();
  const sample = candidates
    .slice(0, 20)
    .map((c) => ({ artist_name: c.artist_name, missing: c.missing }));

  if (opts.dryRun || !isResendConfigured()) {
    return { dryRun: true, candidates: candidates.length, sent: 0, failed: 0, sample };
  }

  const admin = createAdminClient();
  let sent = 0;
  let failed = 0;
  for (const cand of candidates.slice(0, SEND_CAP)) {
    const { data: u } = await admin.auth.admin.getUserById(cand.user_id);
    const email = u?.user?.email;
    if (!email) {
      failed++;
      continue;
    }
    const res = await sendEmail({
      to: email,
      subject: "Te quedó el perfil a medias — termínalo en 5 min",
      html: buildNudgeEmail(cand),
      text: `Hola ${cand.artist_name}, empezaste tu perfil en DROP pero quedó a medias. Termínalo acá: ${SITE}/welcome`,
    });
    if (res.ok) {
      sent++;
      await admin
        .from("dj_profile")
        .update({ onboarding_nudge_sent_at: new Date().toISOString() })
        .eq("user_id", cand.user_id);
      await admin.from("usage_events").insert({
        user_id: cand.user_id,
        event: "onboarding_nudge_sent",
        page: "/welcome",
        metadata: { resend_email_id: res.id, percent: cand.percent },
      });
    } else {
      failed++;
      console.error("[onboarding-nudge] envío falló:", cand.user_id, res.error);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return { dryRun: false, candidates: candidates.length, sent, failed, sample };
}
