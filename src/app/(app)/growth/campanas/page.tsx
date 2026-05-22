import { listGrowthCampaigns, listContentPosts } from "@/lib/queries/growth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, TrendingUp, Plus, ArrowRight } from "lucide-react";
import {
  GROWTH_CAMPAIGN_STATUS_LABELS,
  SOCIAL_PLATFORM_LABELS,
  type GrowthCampaignStatus,
} from "@/types/database";
import { relativeTime, shortDate } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ status?: GrowthCampaignStatus }>;
}

export default async function GrowthCampaignsListPage({
  searchParams,
}: PageProps) {
  const sp = await searchParams;
  const campaigns = await listGrowthCampaigns({ status: sp.status });

  // Para cada campaña, contar posts asociados (publicados vs planeados)
  const allPosts = await listContentPosts({ limit: 500 });
  const postsByCampaign = new Map<string, { published: number; planned: number }>();
  for (const p of allPosts) {
    if (!p.growth_campaign_id) continue;
    const key = p.growth_campaign_id;
    if (!postsByCampaign.has(key))
      postsByCampaign.set(key, { published: 0, planned: 0 });
    const counts = postsByCampaign.get(key)!;
    if (p.status === "publicado") counts.published++;
    if (p.status === "planeado") counts.planned++;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href="/growth"
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Growth
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Campañas de Growth
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Iniciativas para crecer audiencia y engagement en tus redes.
          </p>
        </div>
        <Button asChild>
          <Link href="/growth/campanas/nueva">
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {(["active", "paused", "done", "archived"] as GrowthCampaignStatus[]).map(
          (s) => {
            const isActive = (sp.status || "active") === s;
            return (
              <Link
                key={s}
                href={`/growth/campanas?status=${s}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-accent-soft border-accent/30 text-accent"
                    : "border-border text-fg-muted hover:text-fg hover:border-fg-muted"
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
            1.5k followers en IG en 30 días) y un plan de contenido.
          </p>
          <Button asChild>
            <Link href="/growth/campanas/nueva">+ Crear primera campaña</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const counts = postsByCampaign.get(c.id) || {
              published: 0,
              planned: 0,
            };
            const totalPlan = counts.published + counts.planned;
            const target = c.target_posts_count || 0;
            return (
              <Link key={c.id} href={`/growth/campanas/${c.id}`}>
                <Card className="p-5 hover:border-accent/30 transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base group-hover:text-accent transition-colors">
                          {c.name}
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                          {GROWTH_CAMPAIGN_STATUS_LABELS[c.status]}
                        </span>
                        {c.platforms.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent"
                          >
                            {SOCIAL_PLATFORM_LABELS[p]}
                          </span>
                        ))}
                      </div>
                      {c.goal && (
                        <p className="text-xs text-fg-muted mt-1.5">{c.goal}</p>
                      )}
                      <div className="text-[10px] text-fg-subtle mt-1">
                        Creada {relativeTime(c.created_at)}
                        {c.end_date && ` · Termina ${shortDate(c.end_date)}`}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-fg-muted group-hover:text-accent transition-colors shrink-0" />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded bg-bg border border-border">
                      <div className="text-[9px] uppercase tracking-wider text-fg-subtle">
                        Posts publicados
                      </div>
                      <div className="font-display text-lg leading-none mt-0.5">
                        {counts.published}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-bg border border-border">
                      <div className="text-[9px] uppercase tracking-wider text-fg-subtle">
                        Planeados
                      </div>
                      <div className="font-display text-lg leading-none mt-0.5">
                        {counts.planned}
                      </div>
                    </div>
                    {target > 0 && (
                      <div className="p-2 rounded bg-bg border border-border">
                        <div className="text-[9px] uppercase tracking-wider text-fg-subtle">
                          Objetivo posts
                        </div>
                        <div className="font-display text-lg leading-none mt-0.5">
                          {totalPlan} / {target}
                        </div>
                      </div>
                    )}
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
