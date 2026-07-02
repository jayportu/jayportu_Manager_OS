import {
  getGrowthCampaign,
  listContentPosts,
  getLatestSnapshotsByPlatform,
  listGrowthCampaigns,
  getCampaignROIs,
  getCampaignROI,
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
  AD_PLATFORM_LABELS,
  POST_FORMAT_LABELS,
  POST_STATUS_LABELS,
  type SocialPlatform,
} from "@/types/database";
import { GrowthCampaignActions } from "./actions-bar";
import { shortDate, relativeTime, formatClp } from "@/lib/format";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GrowthCampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const campaign = await getGrowthCampaign(id);
  if (!campaign) notFound();

  const [posts, currentSnapshots, roi, allCampaigns] = await Promise.all([
    listContentPosts({ growthCampaignId: id, limit: 100 }),
    getLatestSnapshotsByPlatform(),
    getCampaignROI(campaign),
    listGrowthCampaigns({ limit: 100 }),
  ]);

  const published = posts.filter((p) => p.status === "publicado");
  const planned = posts.filter(
    (p) => p.status === "planeado" || p.status === "idea" || p.status === "borrador"
  );

  // Comparativa: las últimas 5 campañas (pagadas + orgánicas) para bar chart
  const comparativeCampaigns = allCampaigns
    .filter((c) => c.id !== campaign.id)
    .slice(0, 4);
  const comparativeROIs = await getCampaignROIs(comparativeCampaigns);
  const allROIsForChart = [
    { c: campaign, roi },
    ...comparativeCampaigns.map((c, i) => ({ c, roi: comparativeROIs[i] })),
  ].filter((x) => x.roi.costPerFollower !== null || x.c.id === campaign.id);

  const maxCpf =
    Math.max(
      ...allROIsForChart
        .map((x) => x.roi.costPerFollower ?? 0)
        .concat(1)
    ) || 1;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href="/growth/ads"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>

      {/* Hero brutalist */}
      <div
        className={`border-2 border-border p-6 mb-5 relative overflow-hidden ${
          campaign.is_paid ? "bg-ink text-white" : "bg-bg-panel"
        }`}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap relative z-10">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange flex items-center gap-2">
              <span>— CAMPAÑA · {GROWTH_CAMPAIGN_STATUS_LABELS[campaign.status].toUpperCase()}</span>
              {campaign.is_paid && (
                <span className="bg-orange text-ink px-2 py-0.5 border-2 border-cream">
                  PAGADA
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
              {campaign.name}<span className="text-orange">.</span>
            </h1>
            {campaign.goal && (
              <p className="text-sm mt-2 opacity-80">{campaign.goal}</p>
            )}
            <div className="font-mono text-[10px] mt-3 flex flex-wrap gap-2">
              {campaign.platforms.map((p) => (
                <span key={p} className="px-2 py-0.5 border border-orange">
                  {SOCIAL_PLATFORM_LABELS[p]}
                </span>
              ))}
              {campaign.platform_ads?.map((p) => (
                <span key={p} className="px-2 py-0.5 bg-orange text-ink">
                  {AD_PLATFORM_LABELS[p]}
                </span>
              ))}
              {campaign.end_date && (
                <span className="px-2 py-0.5 border border-orange/50 opacity-80">
                  Termina {shortDate(campaign.end_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <GrowthCampaignActions
              campaignId={campaign.id}
              status={campaign.status}
            />
            {campaign.is_paid && campaign.external_url && (
              <Button asChild variant="orange" size="sm">
                <a
                  href={campaign.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir en Ads Manager
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bloque ROI cuando es pagada */}
      {campaign.is_paid && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          <div className="bg-ink text-white p-5 border-2 border-border">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
              — COSTO POR FOLLOWER
            </div>
            <div className="font-display text-6xl leading-none mt-3">
              {roi.costPerFollower !== null ? (
                <>
                  {formatClp(roi.costPerFollower)}
                  <span className="font-mono text-sm text-orange ml-2">CLP</span>
                </>
              ) : (
                <span className="text-fg-subtle">—</span>
              )}
            </div>
            <div className="font-mono text-[10px] mt-3 text-orange">
              BUDGET {formatClp(campaign.budget_clp)} · Δ {roi.deltaFollowers > 0 ? "+" : ""}
              {roi.deltaFollowers} followers
            </div>
          </div>
          <div className="bg-orange p-5 border-2 border-border">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg">
              — PROGRESO HACIA OBJETIVO
            </div>
            <div className="font-display text-6xl leading-none mt-3 text-fg">
              {roi.targetTotal > 0 ? `${roi.progressPct}%` : "—"}
            </div>
            <div className="font-mono text-[10px] mt-3 text-fg">
              {roi.targetTotal > 0
                ? `${roi.deltaFollowers}/${roi.targetTotal - roi.baselineTotal} followers ganados`
                : "Sin objetivo definido"}
            </div>
            {roi.targetTotal > 0 && (
              <div className="mt-3 h-2 bg-ink/20 border border-border">
                <div
                  className="h-full bg-ink"
                  style={{ width: `${roi.progressPct}%` }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Snapshot pre/post por plataforma */}
      <Card className="p-5 mb-5">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-4">
          — SNAPSHOT PRE/POST POR PLATAFORMA
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {campaign.platforms.map((p) => {
            const baseline = campaign.baseline_followers[p] || 0;
            const target = campaign.target_followers[p] || 0;
            const current = currentSnapshots[p]?.followers ?? baseline;
            const delta = current - baseline;
            return (
              <PlatformProgress
                key={p}
                platform={p}
                baseline={baseline}
                current={current}
                target={target}
                delta={delta}
              />
            );
          })}
        </div>
      </Card>

      {/* Comparativa bar chart con otras campañas */}
      {allROIsForChart.length > 1 && (
        <Card className="p-5 mb-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-4">
            — COMPARATIVA $/FOLLOWER · TUS CAMPAÑAS
          </div>
          <div className="flex items-end gap-3 h-40 pb-2">
            {allROIsForChart.map(({ c, roi: r }) => {
              const cpf = r.costPerFollower;
              const height = cpf !== null ? Math.round((cpf / maxCpf) * 100) : 5;
              const isCurrent = c.id === campaign.id;
              return (
                <div
                  key={c.id}
                  className="flex-1 flex flex-col items-center gap-1 min-w-0"
                >
                  <div className="font-display text-xs leading-none">
                    {cpf !== null ? formatClp(cpf) : "—"}
                  </div>
                  <div
                    className={`w-full border-2 border-border ${
                      isCurrent
                        ? "bg-orange"
                        : cpf !== null && cpf < 700
                        ? "bg-success"
                        : cpf !== null && cpf < 1500
                        ? "bg-cream"
                        : "bg-danger"
                    }`}
                    style={{ height: `${Math.max(5, height)}%` }}
                  />
                  <div className="font-mono text-[9px] font-bold text-center truncate w-full">
                    {c.name.slice(0, 18).toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="font-mono text-[10px] text-fg-muted mt-3">
            * Verde = ROI bueno (&lt;$700) · Naranja = esta campaña · Rojo = ROI alto (&gt;$1500)
          </div>
        </Card>
      )}

      {/* Otras métricas objetivo */}
      {(campaign.target_engagement_rate || campaign.target_posts_count) && (
        <Card className="p-5 mb-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-3">
            — OTRAS MÉTRICAS OBJETIVO
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {campaign.target_posts_count && (
              <div className="p-3 border-2 border-border bg-cream">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  Posts objetivo
                </div>
                <div className="font-display text-2xl leading-none mt-1">
                  {published.length + planned.length} / {campaign.target_posts_count}
                </div>
                <div className="font-mono text-[10px] text-fg-subtle mt-1">
                  {published.length} publicados
                </div>
              </div>
            )}
            {campaign.target_engagement_rate && (
              <div className="p-3 border-2 border-border bg-cream">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                  Engagement target
                </div>
                <div className="font-display text-2xl leading-none mt-1">
                  {campaign.target_engagement_rate}%
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Notas + resultado */}
      {campaign.result_notes && (
        <Card className="p-5 mb-5">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
            — NOTAS DE RESULTADO
          </div>
          <p className="text-sm whitespace-pre-wrap">{campaign.result_notes}</p>
        </Card>
      )}

      {/* Posts */}
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — POSTS DE LA CAMPAÑA ({posts.length})
        </div>
        <Button asChild size="sm" variant="orange">
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
          <Button asChild variant="orange">
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
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-border">
                        {SOCIAL_PLATFORM_LABELS[p.platform]}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-orange text-ink border border-border">
                        {POST_FORMAT_LABELS[p.format]}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border-2 border-border bg-cream">
                        {POST_STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-fg-muted mt-1 flex gap-3 flex-wrap">
                      {p.published_at && (
                        <span>Publicado {relativeTime(p.published_at)}</span>
                      )}
                      {!p.published_at && p.planned_at && (
                        <span>Programado {shortDate(p.planned_at)}</span>
                      )}
                      {p.views !== null && p.views > 0 && (
                        <span>{p.views.toLocaleString("es-CL")} views</span>
                      )}
                      {p.likes !== null && p.likes > 0 && (
                        <span>{p.likes.toLocaleString("es-CL")} likes</span>
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
}: {
  platform: SocialPlatform;
  baseline: number;
  current: number;
  target: number;
  delta: number;
}) {
  const hasTarget = target > 0;
  const objective = target - baseline;
  const pct =
    objective > 0
      ? Math.min(100, Math.max(0, Math.round(((current - baseline) / objective) * 100)))
      : 0;
  return (
    <div className="border-2 border-border">
      <div className="grid grid-cols-2">
        <div className="bg-cream p-3 border-r-2 border-border">
          <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
            — PRE
          </div>
          <div className="font-display text-2xl leading-none mt-1">
            {baseline.toLocaleString("es-CL")}
          </div>
          <div className="font-mono text-[10px] text-fg-muted mt-1">
            {SOCIAL_PLATFORM_LABELS[platform]}
          </div>
        </div>
        <div
          className={`p-3 ${
            delta > 0 ? "bg-orange" : "bg-bg-panel"
          }`}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider">
            — HOY
          </div>
          <div className="font-display text-2xl leading-none mt-1">
            {current.toLocaleString("es-CL")}
          </div>
          {delta !== 0 && (
            <div
              className={`font-mono text-[10px] mt-1 flex items-center gap-1 font-bold ${
                delta > 0 ? "text-fg" : "text-danger"
              }`}
            >
              {delta > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {delta > 0 ? "+" : ""}
              {delta}
            </div>
          )}
        </div>
      </div>
      {hasTarget && (
        <div className="p-2 border-t-2 border-border bg-bg-panel">
          <div className="font-mono text-[9px] uppercase text-fg-muted">
            objetivo {target.toLocaleString("es-CL")} · {pct}%
          </div>
          <div className="h-1.5 bg-cream border border-border mt-1">
            <div
              className="h-full bg-orange"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
