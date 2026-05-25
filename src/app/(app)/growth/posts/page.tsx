import { listContentPosts, listGrowthCampaigns } from "@/lib/queries/growth";
import { Card } from "@/components/ui/card";
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
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a Growth
      </Link>

      {/* Hero brutalist */}
      <div className="border-2 border-ink bg-white p-6 mb-5 relative overflow-hidden">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — GROWTH · CALENDARIO DE CONTENIDO
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          POSTS<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2 max-w-2xl">
          Planeá qué postear y cuándo. Drag &amp; drop entre columnas para cambiar
          estado: idea → borrador → programado → publicado.
        </p>
        <div className="mt-4 flex gap-2 flex-wrap items-center">
          <Button asChild variant="orange">
            <Link href="/growth/posts/nuevo">
              <Plus className="w-4 h-4" />
              Nuevo post
            </Link>
          </Button>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/growth/posts?view=board"
              className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 transition-colors ${
                view === "board"
                  ? "bg-ink text-orange border-ink"
                  : "border-ink text-ink hover:bg-ink hover:text-orange"
              }`}
            >
              Trello
            </Link>
            <Link
              href="/growth/posts?view=list"
              className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 transition-colors ${
                view === "list"
                  ? "bg-ink text-orange border-ink"
                  : "border-ink text-ink hover:bg-ink hover:text-orange"
              }`}
            >
              Lista
            </Link>
          </div>
        </div>
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
  return (
    <>
      {/* Filtros simples */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <Link
          href="/growth/posts?view=list"
          className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 transition-colors ${
            !sp.status
              ? "bg-ink text-orange border-ink"
              : "border-ink text-ink hover:bg-ink hover:text-orange"
          }`}
        >
          Todos
        </Link>
        {(
          ["idea", "borrador", "planeado", "publicado", "cancelado"] as PostStatus[]
        ).map((s) => (
          <Link
            key={s}
            href={`/growth/posts?view=list&status=${s}`}
            className={`font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 border-2 transition-colors ${
              sp.status === s
                ? "bg-ink text-orange border-ink"
                : "border-ink text-ink hover:bg-ink hover:text-orange"
            }`}
          >
            {POST_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <Card className="p-10 text-center">
          <PlayCircle className="w-10 h-10 mx-auto text-fg-subtle mb-3" />
          <h3 className="font-semibold mb-1">Sin posts</h3>
          <p className="text-sm text-fg-muted mb-4 max-w-md mx-auto">
            Cuando publiques un reel, post, set o video, regístralo acá para
            llevar tracking de métricas.
          </p>
          <Button asChild variant="orange">
            <Link href="/growth/posts/nuevo">+ Registrar primer post</Link>
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul>
            {posts.map((p, i) => (
              <li
                key={p.id}
                className={`px-4 py-3 ${
                  i > 0 ? "border-t border-ink" : ""
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
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-ink">
                        {SOCIAL_PLATFORM_LABELS[p.platform]}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-orange text-ink border border-ink">
                        {POST_FORMAT_LABELS[p.format]}
                      </span>
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border-2 border-ink bg-cream">
                        {POST_STATUS_LABELS[p.status]}
                      </span>
                      {p.growth_campaign_id &&
                        campaignMap.has(p.growth_campaign_id) && (
                          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
                            ▶ {campaignMap.get(p.growth_campaign_id)}
                          </span>
                        )}
                    </div>
                    <div className="font-mono text-[10px] text-fg-muted mt-1 flex gap-3 flex-wrap">
                      {p.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Publicado{" "}
                          {relativeTime(p.published_at)}
                        </span>
                      )}
                      {!p.published_at && p.planned_at && (
                        <span className="flex items-center gap-1">
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
                  <ExternalLink className="w-4 h-4 text-fg-muted shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
