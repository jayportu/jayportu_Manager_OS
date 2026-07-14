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
  type PostStatus,
} from "@/types/database";
import { GrowthCampaignActions } from "./actions-bar";
import { shortDate, relativeTime, formatClp } from "@/lib/format";
import {
  SectionHero,
  GlassPanel,
  KpiTile,
  Badge,
  EmptyState,
} from "@/components/hos";

/* Estado de post → tono de Badge (semántico) */
const POST_STATUS_TONE: Record<
  PostStatus,
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  idea: "neutral",
  borrador: "neutral",
  planeado: "info",
  publicado: "up",
  cancelado: "down",
};

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
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Campañas
      </Link>

      {/* Hero — variante pagada indicada en el kicker + badge */}
      <SectionHero
        kicker={`Campaña · ${GROWTH_CAMPAIGN_STATUS_LABELS[campaign.status].toUpperCase()}${
          campaign.is_paid ? " · Pagada" : ""
        }`}
        title={campaign.name}
        sub={campaign.goal || undefined}
        actions={
          <>
            <GrowthCampaignActions
              campaignId={campaign.id}
              status={campaign.status}
            />
            {campaign.is_paid && campaign.external_url && (
              <Button asChild variant="clayPrimary" size="sm">
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
          </>
        }
      />

      {/* Chips de plataformas / pauta / plazo */}
      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        {campaign.is_paid && (
          <Badge tone="up" solid>
            Pagada
          </Badge>
        )}
        {campaign.platforms.map((p) => (
          <Badge key={p} tone="neutral">
            {SOCIAL_PLATFORM_LABELS[p]}
          </Badge>
        ))}
        {campaign.platform_ads?.map((p) => (
          <Badge key={p} tone="info">
            {AD_PLATFORM_LABELS[p]}
          </Badge>
        ))}
        {campaign.end_date && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            Termina {shortDate(campaign.end_date)}
          </span>
        )}
      </div>

      {/* Bloque ROI cuando es pagada */}
      {campaign.is_paid && (
        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <KpiTile
            label="Costo por follower"
            value={roi.costPerFollower !== null ? formatClp(roi.costPerFollower) : "—"}
            sub={roi.costPerFollower !== null ? "CLP" : undefined}
            delta={`Budget ${formatClp(campaign.budget_clp)} · Δ ${
              roi.deltaFollowers > 0 ? "+" : ""
            }${roi.deltaFollowers} followers`}
          />
          <GlassPanel>
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
                — Progreso hacia objetivo
              </div>
              <div className="mt-1.5 font-display text-4xl leading-none md:text-5xl">
                {roi.targetTotal > 0 ? `${roi.progressPct}%` : "—"}
              </div>
              <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/50">
                {roi.targetTotal > 0
                  ? `${roi.deltaFollowers}/${roi.targetTotal - roi.baselineTotal} followers ganados`
                  : "Sin objetivo definido"}
              </div>
              {roi.targetTotal > 0 && (
                <div
                  className="mt-3 h-2 rounded-full"
                  style={{ background: "rgba(255,255,255,.1)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${roi.progressPct}%`,
                      background: "rgb(var(--drop-orange))",
                    }}
                  />
                </div>
              )}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Snapshot pre/post por plataforma */}
      <GlassPanel className="mb-5">
        <div>
          <div className="mb-4 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
            — Snapshot pre/post por plataforma
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        </div>
      </GlassPanel>

      {/* Comparativa bar chart con otras campañas — superficie sólida, sin blur */}
      {allROIsForChart.length > 1 && (
        <div
          className="mb-5 rounded-2xl border border-white/10 p-5"
          style={{ background: "rgba(255,255,255,.02)" }}
        >
          <div className="mb-4 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
            — Comparativa $/follower · tus campañas
          </div>
          <div className="flex h-40 items-end gap-3 pb-2">
            {allROIsForChart.map(({ c, roi: r }) => {
              const cpf = r.costPerFollower;
              const height = cpf !== null ? Math.round((cpf / maxCpf) * 100) : 5;
              const isCurrent = c.id === campaign.id;
              const barColor = isCurrent
                ? "rgb(var(--drop-orange))"
                : cpf !== null && cpf < 700
                ? "rgb(var(--drop-success))"
                : cpf !== null && cpf < 1500
                ? "rgb(var(--drop-cream))"
                : "rgb(var(--drop-danger))";
              return (
                <div
                  key={c.id}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <div className="font-display text-xs leading-none">
                    {cpf !== null ? formatClp(cpf) : "—"}
                  </div>
                  <div
                    className="w-full rounded-t-md border border-white/10"
                    style={{
                      height: `${Math.max(5, height)}%`,
                      background: barColor,
                    }}
                  />
                  <div className="w-full truncate text-center font-mono text-[9px] font-bold text-white/60">
                    {c.name.slice(0, 18).toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 font-mono text-[10px] text-white/45">
            * Verde = ROI bueno (&lt;$700) · Naranja = esta campaña · Rojo = ROI alto (&gt;$1500)
          </div>
        </div>
      )}

      {/* Otras métricas objetivo */}
      {(campaign.target_engagement_rate || campaign.target_posts_count) && (
        <GlassPanel className="mb-5">
          <div>
            <div className="mb-3 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
              — Otras métricas objetivo
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {campaign.target_posts_count && (
                <div
                  className="rounded-xl border border-white/10 p-3"
                  style={{ background: "rgba(255,255,255,.03)" }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                    Posts objetivo
                  </div>
                  <div className="mt-1 font-display text-2xl leading-none">
                    {published.length + planned.length} / {campaign.target_posts_count}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-white/40">
                    {published.length} publicados
                  </div>
                </div>
              )}
              {campaign.target_engagement_rate && (
                <div
                  className="rounded-xl border border-white/10 p-3"
                  style={{ background: "rgba(255,255,255,.03)" }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                    Engagement target
                  </div>
                  <div className="mt-1 font-display text-2xl leading-none">
                    {campaign.target_engagement_rate}%
                  </div>
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Notas + resultado */}
      {campaign.result_notes && (
        <GlassPanel className="mb-5">
          <div>
            <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
              — Notas de resultado
            </div>
            <p className="whitespace-pre-wrap text-sm text-white/80">
              {campaign.result_notes}
            </p>
          </div>
        </GlassPanel>
      )}

      {/* Posts */}
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-white/45">
          — Posts de la campaña ({posts.length})
        </div>
        <Button asChild size="sm" variant="clayPrimary">
          <Link href={`/growth/posts/nuevo?campaign=${campaign.id}`}>
            <Plus className="w-4 h-4" />
            Agregar post
          </Link>
        </Button>
      </div>

      {posts.length === 0 ? (
        <EmptyState
          title="Sin posts en esta campaña"
          sub="Aún no hay posts en esta campaña."
          action={
            <Button asChild variant="clayPrimary">
              <Link href={`/growth/posts/nuevo?campaign=${campaign.id}`}>
                <Plus className="w-4 h-4" />
                Crear primer post
              </Link>
            </Button>
          }
        />
      ) : (
        <GlassPanel>
          <div className="flex flex-col gap-2">
            {posts.map((p) => (
              <Link
                key={p.id}
                href={`/growth/posts/${p.id}`}
                className="group flex items-start justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-white/25"
                style={{ background: "rgba(255,255,255,.03)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold transition-colors group-hover:text-orange">
                      {p.title || "(sin título)"}
                    </span>
                    <Badge tone="neutral">
                      {SOCIAL_PLATFORM_LABELS[p.platform]}
                    </Badge>
                    <Badge tone="info">{POST_FORMAT_LABELS[p.format]}</Badge>
                    <Badge tone={POST_STATUS_TONE[p.status]}>
                      {POST_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-white/45">
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
                <ExternalLink className="mt-1 w-4 h-4 shrink-0 text-white/40" />
              </Link>
            ))}
          </div>
        </GlassPanel>
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
    <div
      className="overflow-hidden rounded-xl border border-white/10"
      style={{ background: "rgba(255,255,255,.02)" }}
    >
      <div className="grid grid-cols-2">
        <div className="border-r border-white/10 p-3">
          <div className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            — PRE
          </div>
          <div className="mt-1 font-display text-2xl leading-none">
            {baseline.toLocaleString("es-CL")}
          </div>
          <div className="mt-1 font-mono text-[10px] text-white/45">
            {SOCIAL_PLATFORM_LABELS[platform]}
          </div>
        </div>
        <div
          className="p-3"
          style={{
            background:
              delta > 0 ? "rgb(var(--drop-orange) / 0.14)" : "rgba(255,255,255,.03)",
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-white/70">
            — HOY
          </div>
          <div className="mt-1 font-display text-2xl leading-none">
            {current.toLocaleString("es-CL")}
          </div>
          {delta !== 0 && (
            <div
              className={`mt-1 flex items-center gap-1 font-mono text-[10px] font-bold ${
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
            </div>
          )}
        </div>
      </div>
      {hasTarget && (
        <div className="border-t border-white/10 p-2.5">
          <div className="font-mono text-[9px] uppercase text-white/45">
            objetivo {target.toLocaleString("es-CL")} · {pct}%
          </div>
          <div
            className="mt-1 h-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,.1)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${pct}%`, background: "rgb(var(--drop-orange))" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
