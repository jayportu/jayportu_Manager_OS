"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Calendar } from "lucide-react";
import {
  type ContentPost,
  type PostStatus,
  SOCIAL_PLATFORM_LABELS,
} from "@/types/database";
import { updateContentPostAction } from "../actions";
import { shortDate, relativeTime } from "@/lib/format";

const COLUMNS: { status: PostStatus; label: string; tint: string }[] = [
  { status: "idea", label: "Ideas", tint: "bg-cream" },
  { status: "borrador", label: "Borrador", tint: "bg-cream" },
  { status: "planeado", label: "Programado", tint: "bg-bg-panel" },
  { status: "publicado", label: "Publicado", tint: "bg-orange" },
];

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const colPosts = postsForColumn(col.status);
        return (
          <div
            key={col.status}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, col.status)}
            className="border-2 border-border bg-bg-panel min-h-[300px] flex flex-col"
          >
            <div className="border-b-2 border-border p-3 flex items-center justify-between bg-cream">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.08em]">
                — {col.label}
              </span>
              <span className="font-display text-lg leading-none bg-ink text-orange px-2 py-0.5">
                {colPosts.length.toString().padStart(2, "0")}
              </span>
            </div>
            <div className="p-2 flex-1 flex flex-col gap-2">
              {colPosts.length === 0 ? (
                <div className="font-mono text-[10px] text-fg-subtle text-center py-6">
                  arrastra acá
                </div>
              ) : (
                colPosts.map((p) => {
                  const isDragging = dragging === p.id;
                  return (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, p.id)}
                      onDragEnd={onDragEnd}
                      className={`border-2 border-border bg-bg-panel p-2.5 cursor-grab active:cursor-grabbing transition-opacity ${
                        isDragging ? "opacity-40" : "hover:shadow-[4px_4px_0_#E85A0C]"
                      }`}
                    >
                      <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-orange">
                        ▶ {SOCIAL_PLATFORM_LABELS[p.platform]}
                      </div>
                      <Link
                        href={`/growth/posts/${p.id}`}
                        className="block font-display text-sm leading-tight mt-1 hover:text-orange transition-colors"
                      >
                        {p.title || "(sin título)"}
                      </Link>
                      <div className="font-mono text-[9px] text-fg-muted mt-1.5 flex flex-wrap gap-2">
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
                            <span className="truncate">
                              ▶ {cMap.get(p.growth_campaign_id)}
                            </span>
                          )}
                      </div>
                      {p.hashtags && p.hashtags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.hashtags.slice(0, 3).map((h) => (
                            <span
                              key={h}
                              className="font-mono text-[8px] text-orange"
                            >
                              #{h}
                            </span>
                          ))}
                          {p.hashtags.length > 3 && (
                            <span className="font-mono text-[8px] text-fg-muted">
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
