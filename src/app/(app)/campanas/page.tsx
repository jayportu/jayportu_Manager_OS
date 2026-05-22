import {
  listCampaigns,
  countCampaignContactsByStatus,
} from "@/lib/queries/campaigns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Megaphone, Plus, ArrowRight } from "lucide-react";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignStatus,
} from "@/types/database";
import { relativeTime } from "@/lib/format";

interface PageProps {
  searchParams: Promise<{ status?: CampaignStatus }>;
}

export default async function CampanasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const campaigns = await listCampaigns({ status: sp.status });

  // KPIs por campaña
  const stats = await Promise.all(
    campaigns.map(async (c) => ({
      campaign: c,
      counts: await countCampaignContactsByStatus(c.id),
    }))
  );

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-7">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-accent" />
            Campañas
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Push organizado a un grupo de contactos. La app lleva el avance.
          </p>
        </div>
        <Button asChild>
          <Link href="/campanas/nueva">
            <Plus className="w-4 h-4" />
            Nueva campaña
          </Link>
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {(["active", "paused", "done", "archived"] as CampaignStatus[]).map(
          (s) => {
            const isActive = (sp.status || "active") === s;
            return (
              <Link
                key={s}
                href={`/campanas?status=${s}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-accent-soft border-accent/30 text-accent"
                    : "border-border text-fg-muted hover:text-fg hover:border-fg-muted"
                }`}
              >
                {CAMPAIGN_STATUS_LABELS[s]}
              </Link>
            );
          }
        )}
      </div>

      {stats.length === 0 ? (
        <Card className="p-10 text-center">
          <Megaphone className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">
            Sin campañas {sp.status ? `en estado "${CAMPAIGN_STATUS_LABELS[sp.status]}"` : ""}
          </h3>
          <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
            Una campaña te ayuda a no perder el hilo cuando contactas a varios
            venues a la vez. Ej: &quot;Push 10 rooftops para sunset Q1 2026&quot;.
          </p>
          <Button asChild>
            <Link href="/campanas/nueva">+ Crear primera campaña</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {stats.map(({ campaign: c, counts }) => {
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const responded =
              (counts.respondio || 0) +
              (counts.interesado || 0) +
              (counts.convertido || 0);
            const sent =
              (counts.enviado || 0) + responded + (counts.no_respondio || 0);
            const conversionRate =
              sent > 0 ? Math.round((responded / sent) * 100) : 0;
            return (
              <Link key={c.id} href={`/campanas/${c.id}`}>
                <Card className="p-5 hover:border-accent/30 transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base group-hover:text-accent transition-colors">
                          {c.name}
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-secondary border border-border text-fg-muted">
                          {CAMPAIGN_STATUS_LABELS[c.status]}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent">
                          {CAMPAIGN_CHANNEL_LABELS[c.channel]}
                        </span>
                      </div>
                      {c.goal && (
                        <p className="text-xs text-fg-muted mt-1.5">{c.goal}</p>
                      )}
                      <div className="text-[10px] text-fg-subtle mt-1.5">
                        Creada {relativeTime(c.created_at)}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-fg-muted group-hover:text-accent transition-colors shrink-0" />
                  </div>

                  {/* KPIs inline */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                    <KpiInline label="Total" value={total} />
                    <KpiInline label="Pendientes" value={counts.pendiente || 0} />
                    <KpiInline label="Enviados" value={sent} />
                    <KpiInline
                      label="Respondieron"
                      value={responded}
                      highlight={responded > 0}
                    />
                    <KpiInline
                      label="Conversión"
                      value={`${conversionRate}%`}
                      highlight={conversionRate >= 20}
                    />
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

function KpiInline({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="p-2 rounded bg-bg border border-border">
      <div className="text-[9px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div
        className={`font-display text-lg leading-none mt-0.5 ${
          highlight ? "text-accent" : "text-fg"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
