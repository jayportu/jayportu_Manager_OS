import {
  listGrowthCampaigns,
  listContentPosts,
  getCampaignROIs,
} from "@/lib/queries/growth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  Plus,
  ArrowUpRight,
  DollarSign,
} from "lucide-react";
import {
  GROWTH_CAMPAIGN_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  AD_PLATFORM_LABELS,
  type GrowthCampaignStatus,
} from "@/types/database";
import { formatClp, relativeTime, shortDate } from "@/lib/format";
import {
  SectionHero,
  GlassPanel,
  KpiTile,
  Badge,
  ClayChip,
  EmptyState,
} from "@/components/hos";

/* Estado de campaña → tono de Badge (semántico) */
const STATUS_TONE: Record<
  GrowthCampaignStatus,
  "up" | "warn" | "info" | "neutral"
> = {
  draft: "neutral",
  active: "up",
  paused: "warn",
  done: "info",
  archived: "neutral",
};

interface PageProps {
  searchParams: Promise<{ status?: GrowthCampaignStatus }>;
}

export default async function GrowthCampaignsListPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const campaigns = await listGrowthCampaigns({ status: sp.status });
  const rois = await getCampaignROIs(campaigns);
  const roiById = new Map(rois.map((r) => [r.campaignId, r]));

  // KPIs agregados
  const paidCampaigns = campaigns.filter((c) => c.is_paid);
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const totalBudget = paidCampaigns.reduce(
    (sum, c) => sum + (c.budget_clp ?? 0),
    0
  );
  const totalDelta = rois.reduce((sum, r) => sum + Math.max(0, r.deltaFollowers), 0);
  const paidROIs = rois.filter(
    (r) => r.isPaid && r.costPerFollower !== null
  );
  const avgCpf =
    paidROIs.length > 0
      ? Math.round(
          paidROIs.reduce((sum, r) => sum + (r.costPerFollower ?? 0), 0) /
            paidROIs.length
        )
      : null;

  // Posts asociados (para mostrar contadores en cards)
  const allPosts = await listContentPosts({ limit: 500 });
  const postsByCampaign = new Map<string, { published: number; planned: number }>();
  for (const p of allPosts) {
    if (!p.growth_campaign_id) continue;
    const key = p.growth_campaign_id;
    if (!postsByCampaign.has(key))
      postsByCampaign.set(key, { published: 0, planned: 0 });
    const counts = postsByCampaign.get(key)!;
    if (p.status === "publicado") counts.published++;
    if (p.status === "planeado" || p.status === "idea" || p.status === "borrador")
      counts.planned++;
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <Link
        href="/growth"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Growth
      </Link>

      <SectionHero
        kicker="Growth · Campañas"
        title="Campañas"
        sub={
          campaigns.length === 0
            ? "Sin campañas todavía. Crea una para trackear tu crecimiento."
            : `${campaigns.length} ${campaigns.length === 1 ? "campaña" : "campañas"} · ${paidCampaigns.length} pagadas · ${activeCount} activas.`
        }
        actions={
          <>
            <Button asChild variant="clay" size="sm">
              <Link href="/growth/ads/nueva">
                <Plus className="w-4 h-4" />
                Orgánica
              </Link>
            </Button>
            <Button asChild variant="clayPrimary" size="sm">
              <Link href="/growth/ads/nueva?paid=1">
                <DollarSign className="w-4 h-4" />
                Pagada
              </Link>
            </Button>
          </>
        }
      />

      {/* KPIs agregados */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Activas"
          value={activeCount}
          sub={`${paidCampaigns.length} pagadas`}
          accent
        />
        <KpiTile
          label="Budget total"
          value={totalBudget > 0 ? formatClp(totalBudget) : "—"}
          sub="CLP · acumulado"
        />
        <KpiTile
          label="+ Seguidores"
          value={`+${totalDelta}`}
          tone="up"
          delta="Suma Δ campañas"
        />
        <KpiTile
          label="$/Follower"
          value={avgCpf !== null ? formatClp(avgCpf) : "—"}
          sub="Promedio pagadas"
        />
      </div>

      {/* Filtros por status — SSR: ClayChip en <Link>, querystring intacto */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Link href="/growth/ads">
          <ClayChip active={!sp.status}>Todas</ClayChip>
        </Link>
        {(["active", "paused", "done", "archived"] as GrowthCampaignStatus[]).map(
          (s) => (
            <Link key={s} href={`/growth/ads?status=${s}`}>
              <ClayChip active={sp.status === s}>
                {GROWTH_CAMPAIGN_STATUS_LABELS[s]}
              </ClayChip>
            </Link>
          )
        )}
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sin campañas"
          sub="Una campaña de growth tiene un objetivo medible (ej: pasar de 1k a 1.5k followers en IG) y opcionalmente, presupuesto de pauta para que DROP calcule tu costo por follower."
          action={
            <Button asChild variant="clayPrimary">
              <Link href="/growth/ads/nueva">
                <Plus className="w-4 h-4" />
                Crear primera campaña
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {campaigns.map((c) => {
            const counts = postsByCampaign.get(c.id) || {
              published: 0,
              planned: 0,
            };
            const roi = roiById.get(c.id);
            return (
              <GlassPanel
                key={c.id}
                sweep
                className="transition-transform hover:-translate-y-0.5"
              >
                <Link href={`/growth/ads/${c.id}`} className="block">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xl leading-tight">
                        {c.name}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge
                          tone={STATUS_TONE[c.status]}
                          solid={c.status === "active"}
                        >
                          {GROWTH_CAMPAIGN_STATUS_LABELS[c.status]}
                        </Badge>
                        <Badge tone={c.is_paid ? "info" : "neutral"}>
                          {c.is_paid ? "Pagada" : "Orgánica"}
                        </Badge>
                      </div>
                      {c.goal && (
                        <p className="mt-2 text-xs text-white/50">{c.goal}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.platforms.map((p) => (
                          <Badge key={p} tone="neutral">
                            {SOCIAL_PLATFORM_LABELS[p]}
                          </Badge>
                        ))}
                        {c.platform_ads?.map((p) => (
                          <Badge key={p} tone="info">
                            {AD_PLATFORM_LABELS[p]}
                          </Badge>
                        ))}
                      </div>
                      <div className="mt-2 font-mono text-[10px] text-white/40">
                        Creada {relativeTime(c.created_at)}
                        {c.end_date && ` · Termina ${shortDate(c.end_date)}`}
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 shrink-0 text-white/30" />
                  </div>

                  {/* Métricas: Δ followers / CPF / posts */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                    <div>
                      <div className="font-mono text-[8px] uppercase tracking-wider text-white/40">
                        + Seguidores
                      </div>
                      <div
                        className={`mt-0.5 flex items-center gap-1 font-display text-lg leading-none ${
                          (roi?.deltaFollowers ?? 0) > 0
                            ? "text-success"
                            : "text-white/50"
                        }`}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        {roi && roi.deltaFollowers !== 0
                          ? `${roi.deltaFollowers > 0 ? "+" : ""}${roi.deltaFollowers}`
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[8px] uppercase tracking-wider text-white/40">
                        Costo / seguidor
                      </div>
                      <div className="mt-0.5 font-display text-lg leading-none">
                        {roi?.costPerFollower !== null &&
                        roi?.costPerFollower !== undefined
                          ? formatClp(roi.costPerFollower)
                          : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[8px] uppercase tracking-wider text-white/40">
                        Posts
                      </div>
                      <div className="mt-0.5 font-display text-lg leading-none">
                        {counts.published}
                        <span className="text-sm text-white/40">
                          {" "}
                          pub · {counts.planned} prog
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
