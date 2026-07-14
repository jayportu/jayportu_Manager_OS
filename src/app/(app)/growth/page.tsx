import {
  listGrowthCampaigns,
  listContentPosts,
  getGrowthDeltas,
  getLatestSnapshotsByPlatform,
} from "@/lib/queries/growth";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  ArrowRight,
  Calendar,
  Eye,
  Heart,
  ExternalLink,
  Plus,
} from "lucide-react";
import {
  SOCIAL_PLATFORM_LABELS,
  GROWTH_CAMPAIGN_STATUS_LABELS,
  POST_FORMAT_LABELS,
  POST_STATUS_LABELS,
  type SocialPlatform,
  type GrowthCampaignStatus,
  type PostStatus,
} from "@/types/database";
import { SnapshotDialog } from "./snapshot-dialog";
import { relativeTime, shortDate } from "@/lib/format";
import {
  SectionHero,
  GlassPanel,
  KpiTile,
  Badge,
  EmptyState,
  MonoLabel,
} from "@/components/hos";

/* Estado de campaña → tono de Badge (Hybrid OS) */
const CAMPAIGN_STATUS_TONE: Record<
  GrowthCampaignStatus,
  "up" | "warn" | "down" | "info" | "neutral"
> = {
  draft: "neutral",
  active: "up",
  paused: "warn",
  done: "info",
  archived: "neutral",
};

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

export default async function GrowthPage() {
  const [campaigns, recentPosts, deltas, snapshots, profile] = await Promise.all([
    listGrowthCampaigns({ status: "active", limit: 5 }),
    listContentPosts({ limit: 8 }),
    getGrowthDeltas(),
    getLatestSnapshotsByPlatform(),
    getMyProfile(),
  ]);

  const platformsWithSnapshots = Object.keys(snapshots);
  const isFirstTime = platformsWithSnapshots.length === 0;

  // Plataformas que tiene URL configurada en el perfil pero NO tienen snapshots todavía.
  // Para esas mostramos un placeholder con CTA "Registrar primer snapshot".
  // Esto resuelve el caso de Instagram (sin auto-sync hasta Sprint 22.5).
  const profilePlatforms: { platform: SocialPlatform; url: string | null }[] = [
    { platform: "instagram", url: profile?.instagram_url ?? null },
    { platform: "youtube", url: profile?.youtube_url ?? null },
    { platform: "soundcloud", url: profile?.soundcloud_url ?? null },
  ];
  const deltasPlatforms = new Set(deltas.map((d) => d.platform));
  const missingPlatforms = profilePlatforms.filter(
    (p) => p.url && p.url.trim().length > 0 && !deltasPlatforms.has(p.platform)
  );

  // Calcular delta total de seguidores en los últimos 30d (suma de todas las
  // plataformas). Si negativo, mostrar con signo "-". Si positivo, con "+".
  const totalDelta = deltas.reduce((sum, d) => sum + (d.delta ?? 0), 0);
  const deltaSign = totalDelta > 0 ? "+" : totalDelta < 0 ? "-" : "";
  const deltaAbs = Math.abs(totalDelta);
  const deltaLabel =
    deltas.length > 0 ? `${deltaSign}${deltaAbs}` : "—";
  // Mejor plataforma (la que creció más, ignorando deltas null)
  const bestDelta = deltas.length > 0
    ? deltas.reduce((max, d) =>
        (d.delta ?? -Infinity) > (max.delta ?? -Infinity) ? d : max
      )
    : null;
  const bestDeltaValue = bestDelta?.delta ?? 0;

  // Subtítulo del hero — mismos datos, sin brutalismo inline.
  const heroSub =
    bestDelta && bestDeltaValue > 0
      ? `${SOCIAL_PLATFORM_LABELS[bestDelta.platform]} lidera el crecimiento (+${bestDeltaValue}). Registro manual + snapshots auto sync para mover esta cifra mes a mes.`
      : "Crecimiento de audiencia en IG, YouTube, SoundCloud y demás. Registro manual o sync auto para medir lo que importa.";

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <SectionHero
        kicker="Agenda · Growth"
        title="Crecimiento"
        sub={heroSub}
        actions={
          <Button asChild variant="clayPrimary" size="sm">
            <Link href="/growth/posts/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo post
            </Link>
          </Button>
        }
      />

      {/* Delta de seguidores — número grande en panel del sistema */}
      <GlassPanel className="mb-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <MonoLabel>Desde tu última actualización</MonoLabel>
            <div className="mt-2 font-display text-4xl leading-none md:text-6xl">
              {deltaLabel} SEGUIDORE{deltaAbs === 1 ? "" : "S"}
              <span className="text-orange">.</span>
            </div>
          </div>
          <SnapshotDialog existingSnapshots={snapshots} buttonVariant="default" />
        </div>
      </GlassPanel>

      {/* Empty state primera vez */}
      {isFirstTime && (
        <div className="mb-6">
          <EmptyState
            icon={TrendingUp}
            title="Empieza registrando tu estado actual"
            sub="Para medir tu crecimiento, necesito saber con cuántos seguidores tienes en cada plataforma. Tarda 30 segundos."
            action={
              <SnapshotDialog
                existingSnapshots={snapshots}
                buttonLabel="Actualizar mis stats ahora"
              />
            }
          />
        </div>
      )}

      {/* KPIs por plataforma */}
      {(deltas.length > 0 || missingPlatforms.length > 0) && (
        <section className="mb-7">
          <MonoLabel>Plataformas</MonoLabel>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deltas.map((d) => (
              <PlatformKpi key={d.platform} delta={d} />
            ))}
          </div>
          {missingPlatforms.length > 0 && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {missingPlatforms.map((p) => (
                <PlatformEmpty
                  key={p.platform}
                  platform={p.platform}
                  snapshots={snapshots}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Ads activos */}
      <section className="mb-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <MonoLabel>Ads activos</MonoLabel>
          <Link
            href="/growth/ads"
            className="font-mono text-[10px] uppercase tracking-wider text-orange hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <EmptyState
            icon={TrendingUp}
            title="Sin campañas activas"
            sub="Una campaña te ayuda a planificar contenido coordinado para crecer."
            action={
              <Button asChild variant="clayPrimary">
                <Link href="/growth/ads/nueva">
                  <Plus className="w-4 h-4" />
                  Crear campaña
                </Link>
              </Button>
            }
          />
        ) : (
          <GlassPanel>
            <div className="flex flex-col gap-2">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/growth/ads/${c.id}`}
                  className="group block rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-white/25"
                  style={{ background: "rgba(255,255,255,.03)" }}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm group-hover:text-orange transition-colors">
                          {c.name}
                        </h3>
                        <Badge
                          tone={CAMPAIGN_STATUS_TONE[c.status]}
                          solid={c.status === "active"}
                        >
                          {GROWTH_CAMPAIGN_STATUS_LABELS[c.status]}
                        </Badge>
                        {c.platforms.map((p) => (
                          <Badge key={p} tone="info">
                            {SOCIAL_PLATFORM_LABELS[p]}
                          </Badge>
                        ))}
                      </div>
                      {c.goal && (
                        <p className="text-xs text-white/55 mt-1.5">{c.goal}</p>
                      )}
                      {c.end_date && (
                        <p className="text-[10px] text-white/40 mt-1">
                          Termina {shortDate(c.end_date)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-orange transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </GlassPanel>
        )}
      </section>

      {/* Posts recientes */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <MonoLabel>Posts recientes</MonoLabel>
          <Link
            href="/growth/posts"
            className="font-mono text-[10px] uppercase tracking-wider text-orange hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="Aún no registraste posts"
            sub="Anota lo que publiques para hacer tracking de qué funciona mejor."
            action={
              <Button asChild variant="clay">
                <Link href="/growth/posts/nuevo">
                  <Plus className="w-4 h-4" />
                  Registrar post
                </Link>
              </Button>
            }
          />
        ) : (
          <GlassPanel>
            <div className="flex flex-col gap-2">
              {recentPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/growth/posts/${p.id}`}
                  className="group flex items-start justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-white/25"
                  style={{ background: "rgba(255,255,255,.03)" }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold truncate group-hover:text-orange transition-colors">
                        {p.title || "(sin título)"}
                      </span>
                      <Badge tone="neutral">
                        {SOCIAL_PLATFORM_LABELS[p.platform]}
                      </Badge>
                      <Badge tone="info">{POST_FORMAT_LABELS[p.format]}</Badge>
                      {p.status !== "publicado" && (
                        <Badge tone={POST_STATUS_TONE[p.status]}>
                          {POST_STATUS_LABELS[p.status]}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-white/45 mt-1 flex gap-3 flex-wrap">
                      {p.published_at && (
                        <span>Publicado {relativeTime(p.published_at)}</span>
                      )}
                      {!p.published_at && p.planned_at && (
                        <span>Planeado {shortDate(p.planned_at)}</span>
                      )}
                      {p.views !== null && p.views > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {p.views.toLocaleString("es-CL")}
                        </span>
                      )}
                      {p.likes !== null && p.likes > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {p.likes.toLocaleString("es-CL")}
                        </span>
                      )}
                    </div>
                  </div>
                  {p.url && (
                    <ExternalLink className="w-4 h-4 text-white/40 shrink-0 mt-1" />
                  )}
                </Link>
              ))}
            </div>
          </GlassPanel>
        )}
      </section>
    </div>
  );
}

function PlatformEmpty({
  platform,
  snapshots,
}: {
  platform: SocialPlatform;
  snapshots: Record<string, import("@/types/database").PlatformSnapshot | null>;
}) {
  return (
    <EmptyState
      icon={TrendingUp}
      title={SOCIAL_PLATFORM_LABELS[platform]}
      sub={
        platform === "instagram"
          ? "Sin auto-sync (manual). Carga tu primer snapshot."
          : "Carga tu primer snapshot."
      }
      action={
        <SnapshotDialog
          existingSnapshots={snapshots}
          buttonLabel="Registrar"
          buttonVariant="outline"
        />
      }
    />
  );
}

function PlatformKpi({
  delta,
}: {
  delta: {
    platform: SocialPlatform;
    followers: number | null;
    delta: number | null;
    delta_pct: number | null;
    snapshot_at: string | null;
    source: "manual" | "auto" | null;
  };
}) {
  const deltaStr =
    delta.delta !== null && delta.delta !== 0
      ? `${delta.delta > 0 ? "+" : ""}${delta.delta.toLocaleString("es-CL")}${
          delta.delta_pct !== null
            ? ` (${delta.delta_pct > 0 ? "+" : ""}${delta.delta_pct}%)`
            : ""
        }`
      : undefined;
  const tone =
    delta.delta !== null && delta.delta > 0
      ? "up"
      : delta.delta !== null && delta.delta < 0
        ? "down"
        : "flat";

  return (
    <div>
      <KpiTile
        label={SOCIAL_PLATFORM_LABELS[delta.platform]}
        value={
          delta.followers !== null
            ? delta.followers.toLocaleString("es-CL")
            : "—"
        }
        sub="Seguidores"
        delta={deltaStr}
        tone={tone}
        accent={delta.source === "auto"}
      />
      {delta.snapshot_at && (
        <div className="mt-1 px-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
          {relativeTime(delta.snapshot_at)}
        </div>
      )}
    </div>
  );
}
