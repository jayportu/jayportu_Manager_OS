import { listContentPosts, listGrowthCampaigns } from "@/lib/queries/growth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  ExternalLink,
  Calendar,
  PlayCircle,
} from "lucide-react";
import {
  SOCIAL_PLATFORM_LABELS,
  POST_FORMAT_LABELS,
  POST_STATUS_LABELS,
  type SocialPlatform,
  type PostStatus,
} from "@/types/database";
import { shortDate, relativeTime } from "@/lib/format";
import { PostsBoard } from "./posts-board";
import {
  SectionHero,
  GlassPanel,
  ClayChip,
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
  searchParams: Promise<{
    platform?: SocialPlatform;
    status?: PostStatus;
    view?: "board" | "list";
  }>;
}

export default async function GrowthPostsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const view = sp.view === "list" ? "list" : "board";

  const [posts, campaigns] = await Promise.all([
    listContentPosts({ platform: sp.platform, status: sp.status, limit: 500 }),
    listGrowthCampaigns({ limit: 100 }),
  ]);
  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

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
        kicker="Growth · Contenido"
        title="Posts"
        sub="Tu pipeline de contenido, de la idea a publicado. Arrastra entre columnas para cambiar estado: idea → borrador → programado → publicado."
        actions={
          <Button asChild variant="clayPrimary" size="sm">
            <Link href="/growth/posts/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo post
            </Link>
          </Button>
        }
      />

      {/* Toggle de vista — SSR: ClayChip envuelto en <Link>, hrefs intactos */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
          Vista
        </span>
        <Link href="/growth/posts?view=board">
          <ClayChip active={view === "board"}>Tablero</ClayChip>
        </Link>
        <Link href="/growth/posts?view=list">
          <ClayChip active={view === "list"}>Lista</ClayChip>
        </Link>
      </div>

      {view === "board" ? (
        <PostsBoard
          posts={posts}
          campaignMap={Array.from(campaignMap.entries())}
        />
      ) : (
        <ListView posts={posts} campaignMap={campaignMap} sp={sp} />
      )}
    </div>
  );
}

function ListView({
  posts,
  campaignMap,
  sp,
}: {
  posts: Awaited<ReturnType<typeof listContentPosts>>;
  campaignMap: Map<string, string>;
  sp: { platform?: SocialPlatform; status?: PostStatus };
}) {
  // Preserva ?platform al cambiar de chip de estado (si está activo)
  const platformQuery = sp.platform ? `&platform=${sp.platform}` : "";
  return (
    <>
      {/* Filtros de estado — SSR: ClayChip en <Link>, querystring intacto */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-white/40">
          Estado
        </span>
        <Link href={`/growth/posts?view=list${platformQuery}`}>
          <ClayChip active={!sp.status}>Todos</ClayChip>
        </Link>
        {(
          ["idea", "borrador", "planeado", "publicado", "cancelado"] as PostStatus[]
        ).map((s) => (
          <Link
            key={s}
            href={`/growth/posts?view=list&status=${s}${platformQuery}`}
          >
            <ClayChip active={sp.status === s}>{POST_STATUS_LABELS[s]}</ClayChip>
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="Sin posts"
          sub="Cuando publiques un reel, post, set o video, regístralo acá para llevar tracking de métricas."
          action={
            <Button asChild variant="clayPrimary">
              <Link href="/growth/posts/nuevo">
                <Plus className="w-4 h-4" />
                Registrar primer post
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate group-hover:text-orange transition-colors">
                      {p.title || "(sin título)"}
                    </span>
                    <Badge tone="neutral">
                      {SOCIAL_PLATFORM_LABELS[p.platform]}
                    </Badge>
                    <Badge tone="info">{POST_FORMAT_LABELS[p.format]}</Badge>
                    <Badge tone={POST_STATUS_TONE[p.status]}>
                      {POST_STATUS_LABELS[p.status]}
                    </Badge>
                    {p.growth_campaign_id &&
                      campaignMap.has(p.growth_campaign_id) && (
                        <Badge tone="neutral">
                          <PlayCircle className="w-2.5 h-2.5" />
                          {campaignMap.get(p.growth_campaign_id)}
                        </Badge>
                      )}
                  </div>
                  <div className="text-[11px] text-white/45 mt-1 flex gap-3 flex-wrap">
                    {p.published_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Publicado{" "}
                        {relativeTime(p.published_at)}
                      </span>
                    )}
                    {!p.published_at && p.planned_at && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Programado{" "}
                        {shortDate(p.planned_at)}
                      </span>
                    )}
                    {p.views !== null && p.views > 0 && (
                      <span>{p.views.toLocaleString("es-CL")} views</span>
                    )}
                    {p.likes !== null && p.likes > 0 && (
                      <span>{p.likes.toLocaleString("es-CL")} likes</span>
                    )}
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-white/40 shrink-0 mt-1" />
              </Link>
            ))}
          </div>
        </GlassPanel>
      )}
    </>
  );
}
