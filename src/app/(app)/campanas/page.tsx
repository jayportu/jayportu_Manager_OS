import {
  listCampaigns,
  countCampaignContactsByStatus,
} from "@/lib/queries/campaigns";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Megaphone, Plus, ArrowRight } from "lucide-react";
import {
  CAMPAIGN_STATUS_LABELS,
  CAMPAIGN_CHANNEL_LABELS,
  type CampaignStatus,
} from "@/types/database";
import { relativeTime } from "@/lib/format";
import {
  SectionHero,
  KpiTile,
  GlassPanel,
  MonoLabel,
  Badge,
  ClayChip,
  EmptyState,
} from "@/components/hos";

/* Estado de campaña → tono de Badge (Hybrid OS) */
const STATUS_TONE: Record<
  CampaignStatus,
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  draft: "neutral",
  active: "info",
  paused: "warn",
  done: "up",
  archived: "neutral",
};

interface PageProps {
  searchParams: Promise<{ status?: CampaignStatus }>;
}

export default async function CampanasPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  // Default real a 'active' para que la lista calce con el chip resaltado
  // (antes: chip "Activas" resaltado pero la lista traía todos los estados).
  const campaigns = await listCampaigns({ status: sp.status ?? "active" });

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
      <SectionHero
        kicker="Negocio · Campañas"
        title={`${String(activeCount).padStart(2, "0")} ACTIVA${
          activeCount === 1 ? "" : "S"
        }`}
        sub="Push organizado a un grupo de contactos. La app lleva el avance, tracking de conversiones y follow-ups automáticos."
        actions={
          <Button asChild variant="clayPrimary" size="sm">
            <Link href="/campanas/nueva">
              <Plus className="w-4 h-4" />
              Nueva campaña
            </Link>
          </Button>
        }
      />

      {/* Filtros — SSR: hrefs y parsing de status intactos, solo ClayChip envuelto en <Link> */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
          Filtrar
        </span>
        {(["active", "paused", "done", "archived"] as CampaignStatus[]).map(
          (s) => {
            const isActive = currentFilter === s;
            return (
              <Link key={s} href={`/campanas?status=${s}`}>
                <ClayChip active={isActive}>
                  {CAMPAIGN_STATUS_LABELS[s]}
                </ClayChip>
              </Link>
            );
          }
        )}
      </div>

      {stats.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={`Sin campañas${
            sp.status ? ` en "${CAMPAIGN_STATUS_LABELS[sp.status]}"` : ""
          }.`}
          sub='Una campaña te ayuda a no perder el hilo cuando contactas a varios venues a la vez. Ej: "Push 10 rooftops para sunset Q1 2026".'
          action={
            <Button asChild variant="clayPrimary">
              <Link href="/campanas/nueva">+ Crear primera campaña</Link>
            </Button>
          }
        />
      ) : (
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <MonoLabel>Campañas</MonoLabel>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {stats.length} {stats.length === 1 ? "campaña" : "campañas"}
            </span>
          </div>

          {/* Filas planas — sin alternancia ink/cream (antes idx % 2) */}
          <div className="flex flex-col gap-3">
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

              return (
                <Link
                  key={c.id}
                  href={`/campanas/${c.id}`}
                  className="group block rounded-xl border border-white/10 p-4 transition-colors hover:border-white/25 hover:bg-white/[0.03] md:p-5"
                >
                  {/* numeración + nombre + status */}
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-3">
                        <span className="font-display text-3xl leading-none text-orange">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-display text-2xl leading-none group-hover:underline md:text-3xl">
                          {c.name}
                        </h3>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge tone={STATUS_TONE[c.status]}>
                          {CAMPAIGN_STATUS_LABELS[c.status]}
                        </Badge>
                        <Badge tone="info">
                          {CAMPAIGN_CHANNEL_LABELS[c.channel]}
                        </Badge>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                          Creada {relativeTime(c.created_at)}
                        </span>
                      </div>
                      {c.goal && (
                        <p className="mt-2 text-sm text-white/55">{c.goal}</p>
                      )}
                    </div>
                    <ArrowRight className="h-6 w-6 shrink-0 text-orange transition-transform group-hover:translate-x-1" />
                  </div>

                  {/* Barra de conversión — track sólido, fill naranja (token) */}
                  {sent > 0 && (
                    <div className="mb-3">
                      <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-white/55">
                        <span>Conversión</span>
                        <span className="font-bold text-orange">
                          {conversionRate}%
                        </span>
                      </div>
                      <div
                        className="h-2.5 w-full overflow-hidden rounded-full"
                        style={{ background: "rgba(255,255,255,.09)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(0, conversionRate)
                            )}%`,
                            background: "rgb(var(--drop-orange))",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* KPIs — kit KpiTile (reemplaza KpiInline) */}
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                    <KpiTile label="Total" value={total} />
                    <KpiTile
                      label="Pendientes"
                      value={counts.pendiente || 0}
                    />
                    <KpiTile label="Enviados" value={sent} />
                    <KpiTile
                      label="Respondieron"
                      value={responded}
                      accent={responded > 0}
                    />
                    <KpiTile
                      label="Conversión"
                      value={`${conversionRate}%`}
                      accent={conversionRate >= 20}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
