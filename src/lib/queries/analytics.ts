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
  const past3 = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString();

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
      .gte("created_at", past3);
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

  const { count: contactCreatorsRaw } = await admin
    .from("contacts")
    .select("user_id", { count: "exact", head: true });
  const contactCreators = contactCreatorsRaw || 0;

  const { count: gmailConnectedRaw } = await admin
    .from("gmail_connections")
    .select("user_id", { count: "exact", head: true });
  const gmailConnected = gmailConnectedRaw || 0;

  const { count: tracklistCreatorsRaw } = await admin
    .from("tracklists")
    .select("user_id", { count: "exact", head: true });
  const tracklistCreators = tracklistCreatorsRaw || 0;

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

function pct(n: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}
