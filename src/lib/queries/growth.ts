import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  GrowthCampaign,
  GrowthCampaignInsert,
  GrowthCampaignStatus,
  ContentPost,
  ContentPostInsert,
  PlatformSnapshot,
  PlatformSnapshotInsert,
  SocialPlatform,
  PostStatus,
} from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

// ─── Growth campaigns ─────────────────────────────────────────────────

export async function listGrowthCampaigns(opts?: {
  status?: GrowthCampaignStatus;
  limit?: number;
}): Promise<GrowthCampaign[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("growth_campaigns")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.status) q = q.eq("status", opts.status);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (error) return [];
  return data as GrowthCampaign[];
}

export async function getGrowthCampaign(
  id: string
): Promise<GrowthCampaign | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("growth_campaigns")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as GrowthCampaign;
}

export async function createGrowthCampaign(
  input: GrowthCampaignInsert
): Promise<GrowthCampaign> {
  const { supabase, user } = await getUserOrThrow();

  // Si no hay baseline, usar los followers actuales del último snapshot por plataforma
  let baseline = input.baseline_followers || {};
  if (Object.keys(baseline).length === 0 && input.platforms.length > 0) {
    const latestSnapshots = await Promise.all(
      input.platforms.map(async (p) => {
        const { data } = await supabase
          .from("platform_snapshots")
          .select("followers")
          .eq("user_id", user.id)
          .eq("platform", p)
          .order("snapshot_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return { platform: p, followers: data?.followers ?? null };
      })
    );
    const tmp: Record<string, number> = {};
    for (const s of latestSnapshots) {
      if (s.followers !== null) tmp[s.platform] = s.followers;
    }
    baseline = tmp;
  }

  const { data, error } = await supabase
    .from("growth_campaigns")
    .insert({
      user_id: user.id,
      name: input.name,
      goal: input.goal || "",
      status: input.status || "active",
      platforms: input.platforms,
      target_followers: input.target_followers || {},
      target_engagement_rate: input.target_engagement_rate ?? null,
      target_posts_count: input.target_posts_count ?? null,
      target_reach: input.target_reach ?? null,
      baseline_followers: baseline,
      baseline_at:
        Object.keys(baseline).length > 0 ? new Date().toISOString() : null,
      end_date: input.end_date || null,
      // Sprint 18 — Campaña pagada
      is_paid: input.is_paid ?? false,
      platform_ads: input.platform_ads ?? [],
      budget_clp: input.budget_clp ?? null,
      external_url: input.external_url ?? null,
      result_notes: input.result_notes ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GrowthCampaign;
}

// ─── Sprint 18 · ROI helpers ─────────────────────────────────────────

export interface CampaignROI {
  campaignId: string;
  isPaid: boolean;
  budgetClp: number | null;
  baselineTotal: number;       // suma de baseline_followers de todas las plataformas
  currentTotal: number;        // followers actuales en las mismas plataformas
  deltaFollowers: number;      // currentTotal - baselineTotal
  costPerFollower: number | null;  // budgetClp / deltaFollowers (null si no aplica o delta<=0)
  targetTotal: number;          // suma de target_followers
  progressPct: number;          // % del objetivo alcanzado
}

/**
 * Calcula el ROI de una campaña: cuántos followers ganó (current - baseline)
 * y el costo por follower (budget / delta) cuando es campaña pagada.
 */
export async function getCampaignROI(
  campaign: GrowthCampaign
): Promise<CampaignROI> {
  const latest = await getLatestSnapshotsByPlatform();

  let baselineTotal = 0;
  let currentTotal = 0;
  let targetTotal = 0;

  for (const p of campaign.platforms) {
    const baseline = campaign.baseline_followers?.[p] ?? 0;
    const current = latest[p]?.followers ?? baseline;
    const target = campaign.target_followers?.[p] ?? 0;
    baselineTotal += baseline;
    currentTotal += current;
    targetTotal += target;
  }

  const deltaFollowers = currentTotal - baselineTotal;
  const costPerFollower =
    campaign.is_paid &&
    campaign.budget_clp !== null &&
    campaign.budget_clp > 0 &&
    deltaFollowers > 0
      ? Math.round(campaign.budget_clp / deltaFollowers)
      : null;

  const objective = targetTotal - baselineTotal;
  const progressPct =
    objective > 0
      ? Math.min(100, Math.max(0, Math.round((deltaFollowers / objective) * 100)))
      : 0;

  return {
    campaignId: campaign.id,
    isPaid: campaign.is_paid,
    budgetClp: campaign.budget_clp,
    baselineTotal,
    currentTotal,
    deltaFollowers,
    costPerFollower,
    targetTotal,
    progressPct,
  };
}

/**
 * Calcula ROIs de múltiples campañas para comparativa
 * (bar chart en /growth/ads).
 */
export async function getCampaignROIs(
  campaigns: GrowthCampaign[]
): Promise<CampaignROI[]> {
  return Promise.all(campaigns.map(getCampaignROI));
}

export async function updateGrowthCampaign(
  id: string,
  patch: Partial<
    Omit<GrowthCampaign, "id" | "user_id" | "created_at" | "updated_at">
  >
): Promise<GrowthCampaign> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("growth_campaigns")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as GrowthCampaign;
}

export async function deleteGrowthCampaign(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("growth_campaigns")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Content posts ────────────────────────────────────────────────────

export async function listContentPosts(opts?: {
  platform?: SocialPlatform;
  status?: PostStatus;
  growthCampaignId?: string;
  limit?: number;
}): Promise<ContentPost[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("content_posts")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.platform) q = q.eq("platform", opts.platform);
  if (opts?.status) q = q.eq("status", opts.status);
  if (opts?.growthCampaignId)
    q = q.eq("growth_campaign_id", opts.growthCampaignId);
  const { data, error } = await q
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("planned_at", { ascending: true, nullsFirst: false })
    .limit(opts?.limit ?? 200);
  if (error) return [];
  return data as ContentPost[];
}

export async function getContentPost(id: string): Promise<ContentPost | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as ContentPost;
}

export async function createContentPost(
  input: ContentPostInsert
): Promise<ContentPost> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("content_posts")
    .insert({
      user_id: user.id,
      platform: input.platform,
      format: input.format || "post",
      title: input.title || "",
      description: input.description || "",
      url: input.url || "",
      status: input.status || "planeado",
      planned_at: input.planned_at || null,
      published_at: input.published_at || null,
      views: input.views ?? null,
      likes: input.likes ?? null,
      comments: input.comments ?? null,
      shares: input.shares ?? null,
      saves: input.saves ?? null,
      plays: input.plays ?? null,
      reach: input.reach ?? null,
      notes: input.notes || "",
      hashtags: input.hashtags ?? [],
      growth_campaign_id: input.growth_campaign_id || null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentPost;
}

export async function updateContentPost(
  id: string,
  patch: Partial<Omit<ContentPost, "id" | "user_id" | "created_at" | "updated_at">>
): Promise<ContentPost> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("content_posts")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as ContentPost;
}

export async function deleteContentPost(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Platform snapshots ───────────────────────────────────────────────

export async function getLatestSnapshotsByPlatform(): Promise<
  Record<string, PlatformSnapshot | null>
> {
  const { supabase, user } = await getUserOrThrow();
  const { data } = await supabase
    .from("platform_snapshots")
    .select("*")
    .eq("user_id", user.id)
    .order("snapshot_at", { ascending: false });
  const result: Record<string, PlatformSnapshot | null> = {};
  for (const row of (data || []) as PlatformSnapshot[]) {
    if (!result[row.platform]) result[row.platform] = row;
  }
  return result;
}

export async function listPlatformSnapshots(opts?: {
  platform?: SocialPlatform;
  limit?: number;
}): Promise<PlatformSnapshot[]> {
  const { supabase, user } = await getUserOrThrow();
  let q = supabase
    .from("platform_snapshots")
    .select("*")
    .eq("user_id", user.id);
  if (opts?.platform) q = q.eq("platform", opts.platform);
  const { data, error } = await q
    .order("snapshot_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (error) return [];
  return data as PlatformSnapshot[];
}

export async function createSnapshot(
  input: PlatformSnapshotInsert
): Promise<PlatformSnapshot> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("platform_snapshots")
    .insert({
      user_id: user.id,
      platform: input.platform,
      followers: input.followers ?? null,
      following: input.following ?? null,
      total_posts: input.total_posts ?? null,
      total_views_lifetime: input.total_views_lifetime ?? null,
      total_likes_lifetime: input.total_likes_lifetime ?? null,
      engagement_rate: input.engagement_rate ?? null,
      notes: input.notes || "",
      source: input.source ?? "manual",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as PlatformSnapshot;
}

export async function deleteSnapshot(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("platform_snapshots")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Dashboard helpers ────────────────────────────────────────────────

export interface GrowthDelta {
  platform: SocialPlatform;
  followers: number | null;
  previous_followers: number | null;
  delta: number | null;
  delta_pct: number | null;
  snapshot_at: string | null;
  source: "manual" | "auto" | null;
}

/**
 * Por cada plataforma con snapshots, devuelve el actual + el delta vs el
 * snapshot anterior (de cualquier momento previo).
 */
export async function getGrowthDeltas(): Promise<GrowthDelta[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data } = await supabase
    .from("platform_snapshots")
    .select("platform, followers, snapshot_at, source")
    .eq("user_id", user.id)
    .order("snapshot_at", { ascending: false });

  const byPlatform = new Map<string, PlatformSnapshot[]>();
  for (const row of (data || []) as PlatformSnapshot[]) {
    if (!byPlatform.has(row.platform)) byPlatform.set(row.platform, []);
    byPlatform.get(row.platform)!.push(row);
  }

  const result: GrowthDelta[] = [];
  byPlatform.forEach((snapshots, platform) => {
    const current = snapshots[0] ?? null;
    const previous = snapshots[1] ?? null;
    const currentFollowers = current?.followers ?? null;
    const previousFollowers = previous?.followers ?? null;
    const delta =
      currentFollowers !== null && previousFollowers !== null
        ? currentFollowers - previousFollowers
        : null;
    const deltaPct =
      delta !== null && previousFollowers !== null && previousFollowers > 0
        ? Math.round((delta / previousFollowers) * 1000) / 10
        : null;
    result.push({
      platform: platform as SocialPlatform,
      followers: currentFollowers,
      previous_followers: previousFollowers,
      delta,
      delta_pct: deltaPct,
      snapshot_at: current?.snapshot_at ?? null,
      source: current?.source ?? null,
    });
  });
  return result;
}
