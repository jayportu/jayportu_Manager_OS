import {
  listGrowthCampaigns,
  listContentPosts,
  getGrowthDeltas,
  getLatestSnapshotsByPlatform,
} from "@/lib/queries/growth";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  ExternalLink,
} from "lucide-react";
import {
  SOCIAL_PLATFORM_LABELS,
  GROWTH_CAMPAIGN_STATUS_LABELS,
  POST_FORMAT_LABELS,
  POST_STATUS_LABELS,
  type SocialPlatform,
} from "@/types/database";
import { SnapshotDialog } from "./snapshot-dialog";
import { relativeTime, shortDate } from "@/lib/format";

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

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      {/* ═══ Hero brutalist ═══ */}
      <div className="border-2 border-ink bg-bg-panel p-6 md:p-7 mb-5 relative overflow-hidden">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — GROWTH · DESDE TU ÚLTIMA ACTUALIZACIÓN
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-4 justify-between">
          <h1 className="font-display text-4xl md:text-6xl leading-none">
            {deltaLabel} SEGUIDORE{deltaAbs === 1 ? "" : "S"}
            <span className="text-orange">.</span>
          </h1>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm">
              <Link href="/growth/posts">
                <Calendar className="w-4 h-4" />
                Posts
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/growth/ads">
                <TrendingUp className="w-4 h-4" />
                Ads
              </Link>
            </Button>
            <SnapshotDialog
              existingSnapshots={snapshots}
              buttonVariant="default"
            />
          </div>
        </div>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          {bestDelta && bestDeltaValue > 0 ? (
            <>
              <strong>{SOCIAL_PLATFORM_LABELS[bestDelta.platform]}</strong>{" "}
              lidera el crecimiento (+{bestDeltaValue}). Registro manual +
              snapshots auto sync para mover esta cifra mes a mes.
            </>
          ) : (
            <>
              Crecimiento de audiencia en IG, YouTube, SoundCloud y demás.
              Registro manual o sync auto para medir lo que importa.
            </>
          )}
        </p>
      </div>

      {/* Empty state primera vez */}
      {isFirstTime && (
        <Card className="p-8 mb-6 bg-accent-soft border-accent/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-accent text-bg flex items-center justify-center font-bold shrink-0">
              !
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-base mb-1">
                Empieza registrando tu estado actual
              </h3>
              <p className="text-sm text-fg-muted mb-3">
                Para medir tu crecimiento, necesito saber con cuántos
                seguidores tienes en cada plataforma. Tarda 30 segundos.
              </p>
              <SnapshotDialog
                existingSnapshots={snapshots}
                buttonLabel="Actualizar mis stats ahora"
              />
            </div>
          </div>
        </Card>
      )}

      {/* KPIs por plataforma */}
      {(deltas.length > 0 || missingPlatforms.length > 0) && (
        <section className="mb-7">
          <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold mb-3">
            Plataformas
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {deltas.map((d) => (
              <PlatformKpi key={d.platform} delta={d} />
            ))}
            {missingPlatforms.map((p) => (
              <PlatformEmpty
                key={p.platform}
                platform={p.platform}
                snapshots={snapshots}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ads activos */}
      <section className="mb-7">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold">
            Ads activos
          </h2>
          <Link
            href="/growth/ads"
            className="text-xs text-accent hover:underline"
          >
            Ver todas →
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-fg-muted mb-3">
              No tienes campañas activas. Una campaña te ayuda a planificar
              contenido coordinado para crecer.
            </p>
            <Button asChild>
              <Link href="/growth/ads/nueva">+ Crear campaña</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <Link key={c.id} href={`/growth/ads/${c.id}`}>
                <Card className="p-4 hover:border-accent/30 transition-colors group cursor-pointer">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm group-hover:text-accent transition-colors">
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
                        <p className="text-xs text-fg-muted mt-1.5">
                          {c.goal}
                        </p>
                      )}
                      {c.end_date && (
                        <p className="text-[10px] text-fg-subtle mt-1">
                          Termina {shortDate(c.end_date)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-fg-muted group-hover:text-accent transition-colors shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Posts recientes */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-fg-muted font-semibold">
            Posts recientes
          </h2>
          <Link
            href="/growth/posts"
            className="text-xs text-accent hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-fg-muted mb-3">
              Aún no registraste posts. Anota lo que publiques para hacer
              tracking de qué funciona mejor.
            </p>
            <Button asChild variant="outline">
              <Link href="/growth/posts/nuevo">+ Registrar post</Link>
            </Button>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <ul>
              {recentPosts.map((p, i) => (
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
                        {p.status !== "publicado" && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/15 border border-warning/30 text-warning">
                            {POST_STATUS_LABELS[p.status]}
                          </span>
                        )}
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
                    {p.url && (
                      <ExternalLink className="w-4 h-4 text-fg-muted shrink-0 mt-1" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
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
    <Card className="p-4 border-dashed border-orange/40 bg-orange/5">
      <div className="flex items-center justify-between gap-1">
        <div className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">
          {SOCIAL_PLATFORM_LABELS[platform]}
        </div>
        <span
          className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-orange/20 border border-orange/40 text-orange"
          title="Sin snapshots todavía"
        >
          sin datos
        </span>
      </div>
      <div className="font-display text-3xl leading-none mt-1.5 text-fg-subtle">—</div>
      <div className="text-[10px] text-fg-subtle mt-0.5">
        {platform === "instagram"
          ? "Sin auto-sync (manual)"
          : "Carga tu primer snapshot"}
      </div>
      <div className="mt-2">
        <SnapshotDialog
          existingSnapshots={snapshots}
          buttonLabel="Registrar"
          buttonVariant="outline"
        />
      </div>
    </Card>
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
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-1">
        <div className="text-[10px] uppercase tracking-wider text-fg-muted font-semibold">
          {SOCIAL_PLATFORM_LABELS[delta.platform]}
        </div>
        {delta.source === "auto" && (
          <span
            className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-soft border border-accent/30 text-accent"
            title="Última actualización vía sync automático"
          >
            auto
          </span>
        )}
      </div>
      <div className="font-display text-3xl leading-none mt-1.5">
        {delta.followers !== null
          ? delta.followers.toLocaleString("es-CL")
          : "—"}
      </div>
      <div className="text-[10px] text-fg-subtle mt-0.5">Seguidores</div>
      {delta.delta !== null && delta.delta !== 0 && (
        <div
          className={`text-xs mt-2 flex items-center gap-1 ${
            delta.delta > 0 ? "text-success" : "text-danger"
          }`}
        >
          {delta.delta > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {delta.delta > 0 ? "+" : ""}
          {delta.delta.toLocaleString("es-CL")}
          {delta.delta_pct !== null && (
            <span>
              {" "}
              ({delta.delta_pct > 0 ? "+" : ""}
              {delta.delta_pct}%)
            </span>
          )}
        </div>
      )}
      {delta.snapshot_at && (
        <div className="text-[10px] text-fg-subtle mt-1">
          {relativeTime(delta.snapshot_at)}
        </div>
      )}
    </Card>
  );
}
