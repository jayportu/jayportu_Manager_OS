import "server-only";

/**
 * Sprint 23.5 — Queries de analytics agregados para /admin/analytics.
 *
 * Todas usan service_role (bypass RLS) porque son agregadas
 * cross-user y la página ya valida is_admin antes de llamar.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface AnalyticsSnapshot {
  activeBetaUsers: number;
  totalBetaApproved: number;
  retentionD7: { active: number; total: number };
  retentionD15: { active: number; total: number };
  npsAvg: number | null;
  npsCount: number;
  topFeatures: Array<{ event: string; count: number; uniqueUsers: number }>;
  onboardingFunnel: Array<{ step: string; count: number; pct: number }>;
}

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const admin = createAdminClient();

  // Beta users
  const { data: betas } = await admin
    .from("dj_profile")
    .select("user_id, beta_status, beta_approved_at");
  const betaList = (betas || []) as Array<{
    user_id: string;
    beta_status: string;
    beta_approved_at: string | null;
  }>;
  const approved = betaList.filter(
    (b) => b.beta_status === "active" || b.beta_status === "expired" || b.beta_status === "paying"
  );
  const activeBetaUsers = betaList.filter((b) => b.beta_status === "active").length;

  // Retención D7/D15: de los aprobados hace >= 7d / 15d, cuántos tuvieron page_view en últimos 7/3d
  const now = Date.now();
  const past7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const past15 = new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString();

  const d7CandidateIds = approved
    .filter((b) => {
      if (!b.beta_approved_at) return false;
      const ageDays = (now - new Date(b.beta_approved_at).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= 7;
    })
    .map((b) => b.user_id);
  const d15CandidateIds = approved
    .filter((b) => {
      if (!b.beta_approved_at) return false;
      const ageDays = (now - new Date(b.beta_approved_at).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= 15;
    })
    .map((b) => b.user_id);

  let d7Active = 0;
  if (d7CandidateIds.length > 0) {
    const { data } = await admin
      .from("usage_events")
      .select("user_id")
      .in("user_id", d7CandidateIds)
      .gte("created_at", past7);
    const distinct = new Set((data || []).map((r) => (r as { user_id: string }).user_id));
    d7Active = distinct.size;
  }
  let d15Active = 0;
  if (d15CandidateIds.length > 0) {
    const { data } = await admin
      .from("usage_events")
      .select("user_id")
      .in("user_id", d15CandidateIds)
      .gte("created_at", past15); // D15 = activos en los últimos 15d (antes: 3d, bug)
    const distinct = new Set((data || []).map((r) => (r as { user_id: string }).user_id));
    d15Active = distinct.size;
  }

  // NPS
  const { data: nps } = await admin
    .from("nps_responses")
    .select("score");
  const npsList = ((nps || []) as Array<{ score: number }>).map((n) => n.score);
  const npsAvg =
    npsList.length > 0
      ? Math.round((npsList.reduce((s, n) => s + n, 0) / npsList.length) * 10) / 10
      : null;

  // Top features últimos 30 días
  const past30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await admin
    .from("usage_events")
    .select("event, user_id")
    .gte("created_at", past30)
    .neq("event", "page_view")
    .limit(20000);
  const eventMap = new Map<string, { count: number; users: Set<string> }>();
  for (const e of (events || []) as Array<{ event: string; user_id: string }>) {
    const m = eventMap.get(e.event) || { count: 0, users: new Set() };
    m.count++;
    m.users.add(e.user_id);
    eventMap.set(e.event, m);
  }
  const topFeatures = Array.from(eventMap.entries())
    .map(([event, m]) => ({
      event,
      count: m.count,
      uniqueUsers: m.users.size,
    }))
    .sort((a, b) => b.uniqueUsers - a.uniqueUsers)
    .slice(0, 12);

  // Funnel onboarding
  const totalUsers = betaList.length;
  const { count: completedOnboardingRaw } = await admin
    .from("dj_profile")
    .select("user_id", { count: "exact", head: true })
    .not("onboarding_completed_at", "is", null);
  const completedOnboarding = completedOnboardingRaw || 0;

  // Usuarios DISTINTOS (no filas) vía RPC. Antes se contaban filas con
  // count:exact → un user con N contactos contaba N y los % pasaban de 100%.
  const { data: funnelRows } = await admin.rpc("onboarding_funnel_counts");
  const fc = (funnelRows?.[0] ?? {}) as {
    contact_creators?: number;
    gmail_connected?: number;
    tracklist_creators?: number;
  };
  const contactCreators = Number(fc.contact_creators) || 0;
  const gmailConnected = Number(fc.gmail_connected) || 0;
  const tracklistCreators = Number(fc.tracklist_creators) || 0;

  const onboardingFunnel = [
    { step: "Tienen profile", count: totalUsers, pct: 100 },
    {
      step: "Completaron onboarding",
      count: completedOnboarding,
      pct: pct(completedOnboarding, totalUsers),
    },
    {
      step: "Crearon 1+ contacto",
      count: contactCreators,
      pct: pct(contactCreators, totalUsers),
    },
    {
      step: "Conectaron Gmail",
      count: gmailConnected,
      pct: pct(gmailConnected, totalUsers),
    },
    {
      step: "Crearon 1+ tracklist",
      count: tracklistCreators,
      pct: pct(tracklistCreators, totalUsers),
    },
  ];

  return {
    activeBetaUsers,
    totalBetaApproved: approved.length,
    retentionD7: { active: d7Active, total: d7CandidateIds.length },
    retentionD15: { active: d15Active, total: d15CandidateIds.length },
    npsAvg,
    npsCount: npsList.length,
    topFeatures,
    onboardingFunnel,
  };
}

export interface ConversionFunnel {
  windowDays: number;
  since: string;
  stages: Array<{
    step: string;
    unit: "sesiones" | "cuentas";
    count: number;
    pctOfPrev: number;
    pctOfTop: number;
  }>;
  betaSources: Array<{ source: string; sessions: number }>;
}

/**
 * Funnel de adquisición → activación, ensamblado de datos que YA existen
 * (site_events anónimo + beta_requests + dj_profile). Sin eventos nuevos y
 * retroactivo. Las 2 primeras etapas son SESIONES únicas; las 4 últimas son
 * CUENTAS — el cruce sesión→cuenta es indicativo. Conteo por actividad en la
 * ventana (no cohorte estricta).
 */
export async function getConversionFunnel(
  windowDays = 30
): Promise<ConversionFunnel> {
  const admin = createAdminClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // Sesiones únicas en el home
  const { data: homeRows } = await admin
    .from("site_events")
    .select("session_id")
    .eq("path", "/")
    .gte("created_at", since)
    .limit(50000);
  const visitors = new Set(
    (homeRows || []).map((r) => (r as { session_id: string }).session_id)
  ).size;

  // Sesiones + fuentes de /beta (una sola query)
  const { data: betaRows } = await admin
    .from("site_events")
    .select("session_id, utm_source, referrer")
    .eq("path", "/beta")
    .gte("created_at", since)
    .limit(50000);
  const betaSessions = new Set<string>();
  const sourceBySession = new Map<string, string>();
  for (const r of (betaRows || []) as Array<{
    session_id: string;
    utm_source: string | null;
    referrer: string | null;
  }>) {
    betaSessions.add(r.session_id);
    if (!sourceBySession.has(r.session_id)) {
      sourceBySession.set(r.session_id, resolveSource(r.utm_source, r.referrer));
    }
  }
  const betaViews = betaSessions.size;
  const srcMap = new Map<string, number>();
  for (const src of sourceBySession.values()) {
    srcMap.set(src, (srcMap.get(src) || 0) + 1);
  }
  const betaSources = Array.from(srcMap.entries())
    .map(([source, sessions]) => ({ source, sessions }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 8);

  // Fondo del funnel: cuentas (estado en dj_profile / beta_requests)
  const { count: requests } = await admin
    .from("beta_requests")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);
  const { count: accounts } = await admin
    .from("dj_profile")
    .select("user_id", { count: "exact", head: true })
    .gte("created_at", since);
  const { count: onboarded } = await admin
    .from("dj_profile")
    .select("user_id", { count: "exact", head: true })
    .gte("onboarding_completed_at", since);
  const { count: activated } = await admin
    .from("dj_profile")
    .select("user_id", { count: "exact", head: true })
    .gte("onboarding_completed_at", since)
    .eq("hidden_from_directory", false);

  const raw: Array<{
    step: string;
    unit: "sesiones" | "cuentas";
    count: number;
  }> = [
    { step: "Visitantes (home)", unit: "sesiones", count: visitors },
    { step: "Vieron /beta", unit: "sesiones", count: betaViews },
    { step: "Solicitudes beta", unit: "cuentas", count: requests || 0 },
    { step: "Cuentas creadas", unit: "cuentas", count: accounts || 0 },
    { step: "Onboarding completo", unit: "cuentas", count: onboarded || 0 },
    {
      step: "Press kit vivo (activados)",
      unit: "cuentas",
      count: activated || 0,
    },
  ];
  const top = raw[0].count || 1;
  const stages = raw.map((s, i) => ({
    ...s,
    pctOfPrev: i === 0 ? 100 : pct(s.count, raw[i - 1].count),
    pctOfTop: pct(s.count, top),
  }));

  return { windowDays, since, stages, betaSources };
}

function resolveSource(
  utmSource: string | null,
  referrer: string | null
): string {
  const utm = utmSource?.trim();
  if (utm) return utm;
  const ref = referrer?.trim();
  if (!ref) return "directo";
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return "otro";
  }
}

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}
