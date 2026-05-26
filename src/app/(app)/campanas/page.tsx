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

const STATUS_BADGE: Record<CampaignStatus, string> = {
  active: "bg-orange text-ink border-ink",
  paused: "bg-warning text-ink border-ink",
  done: "bg-success text-white border-success",
  draft: "bg-cream text-ink border-ink",
  archived: "bg-fg-subtle/20 text-fg-muted border-ink/30",
};

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

  // Contadores rápidos para el hero
  const activeCount = campaigns.filter((c) => c.status === "active").length;
  const currentFilter = sp.status || "active";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* ═══ Hero brutalist ═══ */}
      <div className="border-2 border-ink bg-white p-6 md:p-7 mb-5 relative overflow-hidden">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — CAMPAÑAS · PUSH ORGANIZADO
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-4 justify-between">
          <h1 className="font-display text-4xl md:text-6xl leading-none">
            {String(activeCount).padStart(2, "0")} ACTIVA
            {activeCount === 1 ? "" : "S"}
            <span className="text-orange">.</span>
          </h1>
          <Button asChild variant="orange" size="sm">
            <Link href="/campanas/nueva">
              <Plus className="w-4 h-4" />
              Nueva campaña
            </Link>
          </Button>
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Push organizado a un grupo de contactos. La app lleva el avance,
          tracking de conversiones y follow-ups automáticos.
        </p>
      </div>

      {/* ═══ Filtros brutalist ═══ */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mr-1">
          Filtrar:
        </div>
        {(["active", "paused", "done", "archived"] as CampaignStatus[]).map(
          (s) => {
            const isActive = currentFilter === s;
            return (
              <Link
                key={s}
                href={`/campanas?status=${s}`}
                className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-ink transition-colors ${
                  isActive
                    ? "bg-ink text-orange"
                    : "bg-cream text-ink hover:bg-ink hover:text-orange"
                }`}
              >
                {CAMPAIGN_STATUS_LABELS[s]}
              </Link>
            );
          }
        )}
      </div>

      {stats.length === 0 ? (
        <Card className="p-10 text-center border-2 border-ink">
          <Megaphone className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-display text-2xl mb-1">
            Sin campañas {sp.status ? `en "${CAMPAIGN_STATUS_LABELS[sp.status]}"` : ""}
            <span className="text-orange">.</span>
          </h3>
          <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
            Una campaña te ayuda a no perder el hilo cuando contactas a varios
            venues a la vez. Ej: &quot;Push 10 rooftops para sunset Q1 2026&quot;.
          </p>
          <Button asChild variant="orange">
            <Link href="/campanas/nueva">+ Crear primera campaña</Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {stats.map(({ campaign: c, counts }, idx) => {
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            const responded =
              (counts.respondio || 0) +
              (counts.interesado || 0) +
              (counts.convertido || 0);
            const sent =
              (counts.enviado || 0) + responded + (counts.no_respondio || 0);
            const conversionRate =
              sent > 0 ? Math.round((responded / sent) * 100) : 0;
            // Alternancia visual de cards (cream / ink / cream / ink…)
            const isDark = idx % 2 === 1;
            return (
              <Link
                key={c.id}
                href={`/campanas/${c.id}`}
                className={`block group border-2 border-ink p-5 transition-colors ${
                  isDark
                    ? "bg-ink text-cream hover:bg-ink/90"
                    : "bg-white hover:bg-cream"
                }`}
              >
                {/* numeración + nombre + status */}
                <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span
                        className={`font-display text-3xl leading-none ${
                          isDark ? "text-orange" : "text-orange"
                        }`}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3
                        className={`font-display text-2xl md:text-3xl leading-none group-hover:underline ${
                          isDark ? "text-cream" : "text-ink"
                        }`}
                      >
                        {c.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 ${STATUS_BADGE[c.status]}`}
                      >
                        {CAMPAIGN_STATUS_LABELS[c.status]}
                      </span>
                      <span
                        className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 ${
                          isDark
                            ? "border-cream text-cream"
                            : "border-ink text-ink"
                        }`}
                      >
                        {CAMPAIGN_CHANNEL_LABELS[c.channel]}
                      </span>
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider ${
                          isDark ? "text-cream/60" : "text-fg-subtle"
                        }`}
                      >
                        Creada {relativeTime(c.created_at)}
                      </span>
                    </div>
                    {c.goal && (
                      <p
                        className={`text-sm mt-2 ${
                          isDark ? "text-cream/80" : "text-fg-muted"
                        }`}
                      >
                        {c.goal}
                      </p>
                    )}
                  </div>
                  <ArrowRight
                    className={`w-6 h-6 shrink-0 transition-transform group-hover:translate-x-1 ${
                      isDark ? "text-orange" : "text-orange"
                    }`}
                  />
                </div>

                {/* Progress bar conversión */}
                {sent > 0 && (
                  <div className="mb-3">
                    <div
                      className={`flex justify-between font-mono text-[10px] uppercase tracking-wider mb-1 ${
                        isDark ? "text-cream" : "text-ink"
                      }`}
                    >
                      <span>Conversión</span>
                      <span className="font-bold">{conversionRate}%</span>
                    </div>
                    <div
                      className={`h-3 border-2 ${
                        isDark ? "border-cream bg-ink" : "border-ink bg-cream"
                      } relative`}
                    >
                      <div
                        className="absolute top-0 left-0 h-full bg-orange transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, conversionRate))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* KPIs inline brutalist */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                  <KpiInline label="Total" value={total} dark={isDark} />
                  <KpiInline label="Pendientes" value={counts.pendiente || 0} dark={isDark} />
                  <KpiInline label="Enviados" value={sent} dark={isDark} />
                  <KpiInline
                    label="Respondieron"
                    value={responded}
                    highlight={responded > 0}
                    dark={isDark}
                  />
                  <KpiInline
                    label="Conversión"
                    value={`${conversionRate}%`}
                    highlight={conversionRate >= 20}
                    dark={isDark}
                  />
                </div>
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
  dark,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`p-2 border-2 ${
        dark ? "border-cream/40 bg-ink" : "border-ink/30 bg-cream"
      }`}
    >
      <div
        className={`font-mono text-[9px] uppercase tracking-wider ${
          dark ? "text-cream/60" : "text-fg-subtle"
        }`}
      >
        — {label}
      </div>
      <div
        className={`font-display text-xl leading-none mt-1 ${
          highlight ? "text-orange" : dark ? "text-cream" : "text-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
