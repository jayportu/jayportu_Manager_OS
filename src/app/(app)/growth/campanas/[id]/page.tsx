import {
  getGrowthCampaign,
  listContentPosts,
  getLatestSnapshotsByPlatform,
} from "@/lib/queries/growth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  TrendingUp,
  Plus,
  TrendingDown,
  ExternalLink,
} from "lucide-react";
import {
  GROWTH_CAMPAIGN_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  POST_FORMAT_LABELS,
  POST_STATUS_LABELS,
  type SocialPlatform,
} from "@/types/database";
import { GrowthCampaignActions } from "./actions-bar";
import { shortDate, relativeTime } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GrowthCampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const campaign = await getGrowthCampaign(id);
  if (!campaign) notFound();

  const [posts, currentSnapshots] = await Promise.all([
    listContentPosts({ growthCampaignId: id, limit: 100 }),
    getLatestSnapshotsByPlatform(),
  ]);

  const published = posts.filter((p) => p.status === "publicado");
  const planned = posts.filter((p) => p.status === "planeado");

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href="/growth/campanas"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>

      <Card className="p-6 mb-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-5 h-5 text-accent shrink-0" />
              <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                {campaign.name}
              </h1>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                {GROWTH_CAMPAIGN_STATUS_LABELS[campaign.status]}
              </span>
            </div>
            {campaign.goal && (
              <p className="text-sm text-fg-muted mt-2">{campaign.goal}</p>
            )}
            <div className="text-xs text-fg-subtle mt-2">
              {campaign.platforms
                .map((p) => SOCIAL_PLATFORM_LABELS[p])
                .join(" · ")}
              {campaign.end_date && ` · Termina ${shortDate(campaign.end_date)}`}
            </div>
          </div>
          <GrowthCampaignActions
            campaignId={campaign.id}
            status={campaign.status}
          />
        </div>

        {/* Progreso por plataforma */}
        <div className="mt-5 pt-5 border-t border-border">
          <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3">
            Progreso de seguidores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {campaign.platforms.map((p) => {
              const baseline = campaign.baseline_followers[p] || 0;
              const target = campaign.target_followers[p] || 0;
              const current = currentSnapshots[p]?.followers ?? baseline;
              const delta = current - baseline;
              const progressTotal = target > 0 ? target - baseline : 1;
              const progressDone = delta;
              const progressPct =
                progressTotal > 0
                  ? Math.min(
                      100,
                      Math.max(0, Math.round((progressDone / progressTotal) * 100))
                    )
                  : 0;
              return (
                <PlatformProgress
                  key={p}
                  platform={p}
                  baseline={baseline}
                  current={current}
                  target={target}
                  delta={delta}
                  progressPct={progressPct}
                />
              );
            })}
          </div>
        </div>

        {/* Otras métricas objetivo */}
        {(campaign.target_engagement_rate || campaign.target_posts_count) && (
          <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-3">
            {campaign.target_posts_count && (
              <div className="p-3 rounded bg-bg border border-border">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">
                  Posts objetivo
                </div>
                <div className="font-display text-2xl leading-none mt-1">
                  {published.length + planned.length} / {campaign.target_posts_count}
                </div>
                <div className="text-[10px] text-fg-subtle mt-1">
                  {published.length} publicados
                </div>
              </div>
            )}
            {campaign.target_engagement_rate && (
              <div className="p-3 rounded bg-bg border border-border">
                <div className="text-[10px] uppercase tracking-wider text-fg-muted">
                  Engagement objetivo
                </div>
                <div className="font-display text-2xl leading-none mt-1">
                  {campaign.target_engagement_rate}%
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Posts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Posts ({posts.length})
        </h2>
        <Button asChild size="sm">
          <Link href={`/growth/posts/nuevo?campaign=${campaign.id}`}>
            <Plus className="w-4 h-4" />
            Agregar post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-fg-muted mb-3">
            Aún no hay posts en esta campaña.
          </p>
          <Button asChild>
            <Link href={`/growth/posts/nuevo?campaign=${campaign.id}`}>
              + Crear primer post
            </Link>
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {posts.map((p, i) => (
              <li
                key={p.id}
                className={`px-4 py-3 ${
                  i > 0 ? "border-t border-border" : ""
                } hover:bg-bg-subtle transition-colors`}
              >
                <Link
                  href={`/growth/posts/${p.id}`}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate">
                        {p.title || "(sin título)"}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                        {SOCIAL_PLATFORM_LABELS[p.platform]}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                        {POST_FORMAT_LABELS[p.format]}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          p.status === "publicado"
                            ? "bg-success/15 border border-success/30 text-success"
                            : p.status === "planeado"
                            ? "bg-warning/15 border border-warning/30 text-warning"
                            : "bg-secondary border border-border text-fg-muted"
                        }`}
                      >
                        {POST_STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="text-[11px] text-fg-muted mt-1 flex gap-3 flex-wrap">
                      {p.published_at && (
                        <span>Publicado {relativeTime(p.published_at)}</span>
                      )}
                      {!p.published_at && p.planned_at && (
                        <span>Planeado {shortDate(p.planned_at)}</span>
                      )}
                      {p.views !== null && p.views > 0 && (
                        <span>👁 {p.views.toLocaleString("es-CL")}</span>
                      )}
                      {p.likes !== null && p.likes > 0 && (
                        <span>❤ {p.likes.toLocaleString("es-CL")}</span>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-fg-muted shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function PlatformProgress({
  platform,
  baseline,
  current,
  target,
  delta,
  progressPct,
}: {
  platform: SocialPlatform;
  baseline: number;
  current: number;
  target: number;
  delta: number;
  progressPct: number;
}) {
  const hasTarget = target > 0;
  return (
    <div className="p-3 rounded-lg bg-bg border border-border">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider">
          {SOCIAL_PLATFORM_LABELS[platform]}
        </div>
        {delta !== 0 && (
          <span
            className={`text-[11px] flex items-center gap-1 ${
              delta > 0 ? "text-success" : "text-danger"
            }`}
          >
            {delta > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl leading-none">
          {current.toLocaleString("es-CL")}
        </span>
        {hasTarget && (
          <span className="text-xs text-fg-muted">
            / {target.toLocaleString("es-CL")}
          </span>
        )}
      </div>
      <div className="text-[10px] text-fg-subtle mt-1">
        Empezó en {baseline.toLocaleString("es-CL")}
      </div>
      {hasTarget && (
        <div className="mt-2">
          <div className="h-1.5 bg-bg-subtle rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="text-[10px] text-fg-muted mt-1">
            {progressPct}% del objetivo
          </div>
        </div>
      )}
    </div>
  );
}
