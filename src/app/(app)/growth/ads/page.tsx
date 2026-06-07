import {
  listGrowthCampaigns,
  listContentPosts,
  getCampaignROIs,
} from "@/lib/queries/growth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Plus, ArrowRight, DollarSign } from "lucide-react";
import {
  GROWTH_CAMPAIGN_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  AD_PLATFORM_LABELS,
  type GrowthCampaignStatus,
} from "@/types/database";
import { relativeTime, shortDate } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ status?: GrowthCampaignStatus }>;
}

function formatClp(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-CL")}`;
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
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Growth
      </Link>

      {/* Hero header — Type Beat */}
      <div className="border-2 border-ink bg-white p-6 mb-5 relative overflow-hidden">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — GROWTH · CAMPAÑAS
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          CAMPAÑAS<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          {campaigns.length === 0
            ? "Sin campañas todavía. Crea una para trackear tu crecimiento."
            : `${campaigns.length} ${campaigns.length === 1 ? "campaña" : "campañas"} · ${paidCampaigns.length} pagadas · ${activeCount} activas.`}
        </p>
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href="/growth/ads/nueva">
              <Plus className="w-4 h-4" />
              Orgánica
            </Link>
          </Button>
          <Button asChild variant="orange">
            <Link href="/growth/ads/nueva?paid=1">
              <DollarSign className="w-4 h-4" />
              Pagada
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI grid Sprint 18 */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink mb-5">
        <div className="bg-white p-4 border-r-2 border-ink">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">— ACTIVAS</div>
          <div className="font-display text-4xl leading-none mt-2">
            {activeCount.toString().padStart(2, "0")}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">
            {paidCampaigns.length} pagadas
          </div>
        </div>
        <div className="bg-orange p-4 border-r-2 border-ink">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">— BUDGET TOTAL</div>
          <div className="font-display text-4xl leading-none mt-2">
            {totalBudget > 0 ? formatClp(totalBudget) : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2">CLP · ACUMULADO</div>
        </div>
        <div className="bg-white p-4 border-r-2 border-ink">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">— FOLLOWERS GANADOS</div>
          <div className="font-display text-4xl leading-none mt-2 text-success">
            +{totalDelta}
          </div>
          <div className="font-mono text-[10px] mt-2 text-fg-muted">SUMA Δ CAMPAÑAS</div>
        </div>
        <div className="bg-ink p-4 text-cream">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">— $/FOLLOWER</div>
          <div className="font-display text-4xl leading-none mt-2">
            {avgCpf !== null ? formatClp(avgCpf) : "—"}
          </div>
          <div className="font-mono text-[10px] mt-2 text-orange">PROMEDIO PAGADAS</div>
        </div>
      </div>

      {/* Filtros por status */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <Link
          href="/growth/ads"
          className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 border-2 transition-colors ${
            !sp.status
              ? "bg-ink text-orange border-ink"
              : "border-ink text-ink hover:bg-ink hover:text-orange"
          }`}
        >
          Todas
        </Link>
        {(["active", "paused", "done", "archived"] as GrowthCampaignStatus[]).map(
          (s) => {
            const isActive = sp.status === s;
            return (
              <Link
                key={s}
                href={`/growth/ads?status=${s}`}
                className={`font-mono text-[10px] font-bold uppercase tracking-[0.08em] px-3 py-1.5 border-2 transition-colors ${
                  isActive
                    ? "bg-ink text-orange border-ink"
                    : "border-ink text-ink hover:bg-ink hover:text-orange"
                }`}
              >
                {GROWTH_CAMPAIGN_STATUS_LABELS[s]}
              </Link>
            );
          }
        )}
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-10 text-center">
          <TrendingUp className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin campañas</h3>
          <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
            Una campaña de growth tiene un objetivo medible (ej: pasar de 1k a
            1.5k followers en IG) y opcionalmente, presupuesto de pauta para que
            DROP calcule tu costo por follower.
          </p>
          <Button asChild variant="orange">
            <Link href="/growth/ads/nueva">+ Crear primera campaña</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const counts = postsByCampaign.get(c.id) || {
              published: 0,
              planned: 0,
            };
            const roi = roiById.get(c.id);
            return (
              <Link key={c.id} href={`/growth/ads/${c.id}`}>
                <Card className="p-5 hover:border-orange transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-2xl leading-none">
                          {c.name}
                        </h3>
                        {c.is_paid && (
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-orange text-ink border-2 border-ink">
                            PAGADA
                          </span>
                        )}
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-cream text-ink border-2 border-ink">
                          {GROWTH_CAMPAIGN_STATUS_LABELS[c.status]}
                        </span>
                      </div>
                      {c.goal && (
                        <p className="text-xs text-fg-muted mt-1.5">{c.goal}</p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.platforms.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-ink"
                          >
                            {SOCIAL_PLATFORM_LABELS[p]}
                          </span>
                        ))}
                        {c.platform_ads?.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-info text-white border border-ink"
                          >
                            {AD_PLATFORM_LABELS[p]}
                          </span>
                        ))}
                      </div>
                      <div className="font-mono text-[10px] text-fg-subtle mt-2">
                        Creada {relativeTime(c.created_at)}
                        {c.end_date && ` · Termina ${shortDate(c.end_date)}`}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-fg-muted group-hover:text-orange transition-colors shrink-0" />
                  </div>

                  {/* Métricas: posts + ROI si es pagada */}
                  <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink">
                    <div className="p-2 border-r-2 border-ink bg-cream">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                        Publicados
                      </div>
                      <div className="font-display text-xl leading-none mt-1">
                        {counts.published}
                      </div>
                    </div>
                    <div className="p-2 border-r-2 border-ink bg-cream">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                        Planeados
                      </div>
                      <div className="font-display text-xl leading-none mt-1">
                        {counts.planned}
                      </div>
                    </div>
                    <div className="p-2 border-r-2 border-ink bg-white">
                      <div className="font-mono text-[9px] uppercase tracking-wider text-fg-muted">
                        Δ Followers
                      </div>
                      <div
                        className={`font-display text-xl leading-none mt-1 ${
                          (roi?.deltaFollowers ?? 0) > 0
                            ? "text-success"
                            : "text-fg-muted"
                        }`}
                      >
                        {roi && roi.deltaFollowers !== 0
                          ? `${roi.deltaFollowers > 0 ? "+" : ""}${roi.deltaFollowers}`
                          : "—"}
                      </div>
                    </div>
                    <div
                      className={`p-2 ${
                        c.is_paid ? "bg-ink text-cream" : "bg-cream"
                      }`}
                    >
                      <div
                        className={`font-mono text-[9px] uppercase tracking-wider ${
                          c.is_paid ? "text-orange" : "text-fg-muted"
                        }`}
                      >
                        $/Follower
                      </div>
                      <div className="font-display text-xl leading-none mt-1">
                        {roi?.costPerFollower !== null &&
                        roi?.costPerFollower !== undefined
                          ? formatClp(roi.costPerFollower)
                          : "—"}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
