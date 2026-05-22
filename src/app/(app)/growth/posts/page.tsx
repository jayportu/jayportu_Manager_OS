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

interface PageProps {
  searchParams: Promise<{
    platform?: SocialPlatform;
    status?: PostStatus;
  }>;
}

export default async function GrowthPostsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const [posts, campaigns] = await Promise.all([
    listContentPosts({ platform: sp.platform, status: sp.status, limit: 200 }),
    listGrowthCampaigns({ limit: 100 }),
  ]);
  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

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
            Posts
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            Track de qué publicaste, métricas, y qué tienes planeado.
          </p>
        </div>
        <Button asChild>
          <Link href="/growth/posts/nuevo">
            <Plus className="w-4 h-4" />
            Nuevo post
          </Link>
        </Button>
      </div>

      {/* Filtros simples */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        <Link
          href="/growth/posts"
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !sp.status
              ? "bg-accent-soft border-accent/30 text-accent"
              : "border-border text-fg-muted hover:text-fg"
          }`}
        >
          Todos
        </Link>
        {(["planeado", "publicado", "cancelado"] as PostStatus[]).map((s) => (
          <Link
            key={s}
            href={`/growth/posts?status=${s}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sp.status === s
                ? "bg-accent-soft border-accent/30 text-accent"
                : "border-border text-fg-muted hover:text-fg"
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
          <Button asChild>
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
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                          p.status === "publicado"
                            ? "bg-success/15 border border-success/30 text-success"
                            : p.status === "planeado"
                            ? "bg-warning/15 border border-warning/30 text-warning"
                            : "bg-secondary border border-border text-fg-muted"
                        }`}
                      >
                        {POST_STATUS_LABELS[p.status]}
                      </span>
                      {p.growth_campaign_id &&
                        campaignMap.has(p.growth_campaign_id) && (
                          <span className="text-[10px] uppercase tracking-wider text-fg-muted">
                            🎯 {campaignMap.get(p.growth_campaign_id)}
                          </span>
                        )}
                    </div>
                    <div className="text-[11px] text-fg-muted mt-1 flex gap-3 flex-wrap">
                      {p.published_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Publicado{" "}
                          {relativeTime(p.published_at)}
                        </span>
                      )}
                      {!p.published_at && p.planned_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Planeado{" "}
                          {shortDate(p.planned_at)}
                        </span>
                      )}
                      {p.views !== null && p.views > 0 && (
                        <span>👁 {p.views.toLocaleString("es-CL")}</span>
                      )}
                      {p.likes !== null && p.likes > 0 && (
                        <span>❤ {p.likes.toLocaleString("es-CL")}</span>
                      )}
                      {p.comments !== null && p.comments > 0 && (
                        <span>💬 {p.comments.toLocaleString("es-CL")}</span>
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
    </div>
  );
}
