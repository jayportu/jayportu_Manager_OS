"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/admin/confirm-dialog";
import {
  Calendar,
  Copy,
  PlayCircle,
  Instagram,
  Youtube,
  Music,
  Music2,
  Twitter,
  Facebook,
  Cloud,
  Share2,
  type LucideIcon,
} from "lucide-react";
import {
  type ContentPost,
  type PostStatus,
  type SocialPlatform,
  SOCIAL_PLATFORM_LABELS,
} from "@/types/database";
import { updateContentPostAction, duplicateContentPostAction } from "../actions";
import { shortDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const COLUMNS: { status: PostStatus; label: string; accent?: boolean }[] = [
  { status: "idea", label: "Ideas" },
  { status: "borrador", label: "Borrador" },
  { status: "planeado", label: "Programado" },
  { status: "publicado", label: "Publicado", accent: true },
];

/* Plataforma → icono lucide (reemplaza el marcador ▶) */
const PLATFORM_ICON: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  youtube: Youtube,
  spotify: Music,
  soundcloud: Cloud,
  tiktok: Music2,
  twitter: Twitter,
  facebook: Facebook,
  otro: Share2,
};

interface Props {
  posts: ContentPost[];
  campaignMap: [string, string][];
}

export function PostsBoard({ posts, campaignMap }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [dragging, setDragging] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Map<string, PostStatus>>(
    new Map()
  );
  const cMap = new Map(campaignMap);

  function effectiveStatus(p: ContentPost): PostStatus {
    return optimistic.get(p.id) ?? p.status;
  }

  function postsForColumn(status: PostStatus): ContentPost[] {
    return posts.filter((p) => effectiveStatus(p) === status);
  }

  function onDragStart(e: React.DragEvent, postId: string) {
    setDragging(postId);
    e.dataTransfer.setData("text/plain", postId);
    e.dataTransfer.effectAllowed = "move";
  }

  function onDragEnd() {
    setDragging(null);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDrop(e: React.DragEvent, newStatus: PostStatus) {
    e.preventDefault();
    const postId = e.dataTransfer.getData("text/plain") || dragging;
    if (!postId) return;
    setDragging(null);

    const post = posts.find((p) => p.id === postId);
    if (!post || effectiveStatus(post) === newStatus) return;

    // Optimistic update local
    setOptimistic((m) => new Map(m).set(postId, newStatus));

    startTransition(async () => {
      // Si pasa a "publicado" y no tiene published_at, marcarlo con ahora
      const patch: { status: PostStatus; published_at?: string } = {
        status: newStatus,
      };
      if (newStatus === "publicado" && !post.published_at) {
        patch.published_at = new Date().toISOString();
      }
      const r = await updateContentPostAction(postId, patch);
      if (!r.ok) {
        // Revert optimistic
        setOptimistic((m) => {
          const n = new Map(m);
          n.delete(postId);
          return n;
        });
        void confirm({
          title: "No se pudo cambiar el estado",
          message: r.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
      } else {
        router.refresh();
      }
    });
  }

  function handleDuplicate(e: React.MouseEvent, postId: string) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      const r = await duplicateContentPostAction(postId);
      if (r.ok) router.push(`/growth/posts/${r.data.id}`);
      else {
        void confirm({
          title: "No se pudo duplicar",
          message: r.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
      }
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const colPosts = postsForColumn(col.status);
        return (
          <div
            key={col.status}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.status)}
            className="flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-white/10"
            style={{ background: "rgba(255,255,255,.02)" }}
          >
            <div
              className={cn(
                "flex items-center justify-between border-b border-white/10 px-3 py-2.5",
                col.accent && "bg-orange/10"
              )}
            >
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                {col.label}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/60">
                {colPosts.length.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2.5">
              {colPosts.length === 0 ? (
                <div className="py-6 text-center font-mono text-[10px] uppercase tracking-wider text-white/25">
                  arrastra acá
                </div>
              ) : (
                colPosts.map((p) => {
                  const isDragging = dragging === p.id;
                  const PlatIcon = PLATFORM_ICON[p.platform];
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, p.id)}
                      onDragEnd={onDragEnd}
                      className={cn(
                        "rounded-xl border border-white/10 p-2.5 cursor-grab active:cursor-grabbing transition-all",
                        isDragging
                          ? "opacity-40"
                          : "hover:border-white/25 hover:shadow-[4px_4px_0_rgb(var(--drop-orange))]"
                      )}
                      style={{ background: "rgba(255,255,255,.04)" }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold uppercase tracking-wider text-orange">
                          <PlatIcon className="w-2.5 h-2.5" />
                          {SOCIAL_PLATFORM_LABELS[p.platform]}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(e, p.id)}
                          onMouseDown={(e) => e.stopPropagation()}
                          draggable={false}
                          title="Duplicar post"
                          aria-label={`Duplicar post ${p.title || "sin título"}`}
                          className="shrink-0 -mr-0.5 -mt-0.5 p-1 text-white/40 hover:text-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <Link
                        href={`/growth/posts/${p.id}`}
                        className="block font-display text-sm leading-tight mt-1 hover:text-orange transition-colors"
                      >
                        {p.title || "(sin título)"}
                      </Link>
                      <div className="font-mono text-[9px] text-white/45 mt-1.5 flex flex-wrap gap-2">
                        {p.planned_at && !p.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            {shortDate(p.planned_at)}
                          </span>
                        )}
                        {p.published_at && (
                          <span>{relativeTime(p.published_at)}</span>
                        )}
                        {p.growth_campaign_id &&
                          cMap.has(p.growth_campaign_id) && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <PlayCircle className="w-2.5 h-2.5" />
                              {cMap.get(p.growth_campaign_id)}
                            </span>
                          )}
                      </div>
                      {p.hashtags && p.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {p.hashtags.slice(0, 3).map((h) => (
                            <span
                              key={h}
                              className="font-mono text-[9px] text-orange"
                            >
                              #{h}
                            </span>
                          ))}
                          {p.hashtags.length > 3 && (
                            <span className="font-mono text-[9px] text-white/45">
                              +{p.hashtags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
