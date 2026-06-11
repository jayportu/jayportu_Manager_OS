"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_LABELS,
  POST_FORMATS,
  POST_FORMAT_LABELS,
  POST_STATUS,
  POST_STATUS_LABELS,
  type ContentPost,
  type PostFormat,
  type PostStatus,
  type SocialPlatform,
} from "@/types/database";
import {
  createContentPostAction,
  updateContentPostAction,
  deleteContentPostAction,
} from "../actions";

interface Campaign {
  id: string;
  name: string;
}

interface Props {
  initial?: ContentPost;
  campaigns: Campaign[];
  defaultCampaignId?: string;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function PostForm({ initial, campaigns, defaultCampaignId }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [platform, setPlatform] = useState<SocialPlatform>(
    initial?.platform || "instagram"
  );
  const [format, setFormat] = useState<PostFormat>(initial?.format || "reel");
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [status, setStatus] = useState<PostStatus>(initial?.status || "planeado");
  const [plannedAt, setPlannedAt] = useState(toLocalInput(initial?.planned_at || null));
  const [publishedAt, setPublishedAt] = useState(
    toLocalInput(initial?.published_at || null)
  );
  const [campaignId, setCampaignId] = useState<string>(
    initial?.growth_campaign_id || defaultCampaignId || ""
  );
  const [views, setViews] = useState(initial?.views?.toString() || "");
  const [likes, setLikes] = useState(initial?.likes?.toString() || "");
  const [comments, setComments] = useState(initial?.comments?.toString() || "");
  const [shares, setShares] = useState(initial?.shares?.toString() || "");
  const [saves, setSaves] = useState(initial?.saves?.toString() || "");
  const [plays, setPlays] = useState(initial?.plays?.toString() || "");
  const [reach, setReach] = useState(initial?.reach?.toString() || "");
  const [notes, setNotes] = useState(initial?.notes || "");

  function parseInt0(v: string): number | null {
    if (!v) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      platform,
      format,
      title,
      description,
      url,
      status,
      planned_at: plannedAt ? new Date(plannedAt).toISOString() : null,
      published_at:
        status === "publicado" && publishedAt
          ? new Date(publishedAt).toISOString()
          : null,
      growth_campaign_id: campaignId || null,
      views: parseInt0(views),
      likes: parseInt0(likes),
      comments: parseInt0(comments),
      shares: parseInt0(shares),
      saves: parseInt0(saves),
      plays: parseInt0(plays),
      reach: parseInt0(reach),
      notes,
    };
    startTransition(async () => {
      if (initial) {
        const r = await updateContentPostAction(initial.id, payload);
        if (r.ok) {
          router.push("/growth/posts");
          router.refresh();
        } else {
          setError(r.error);
        }
      } else {
        const r = await createContentPostAction(payload);
        if (r.ok) {
          router.push("/growth/posts");
          router.refresh();
        } else {
          setError(r.error);
        }
      }
    });
  }

  async function handleDelete() {
    if (!initial) return;
    const { ok } = await confirm({
      title: "¿Borrar este post?",
      variant: "danger",
      confirmLabel: "Borrar",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteContentPostAction(initial.id);
      router.push("/growth/posts");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          General
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="platform">Plataforma</Label>
            <SelectNative
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
            >
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {SOCIAL_PLATFORM_LABELS[p]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="format">Formato</Label>
            <SelectNative
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as PostFormat)}
            >
              {POST_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {POST_FORMAT_LABELS[f]}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej: Reel cabina La Feria"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descripción / caption</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">URL (opcional)</Label>
          <Input
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://instagram.com/p/..."
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Estado y fechas
        </h2>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <SelectNative
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PostStatus)}
            >
              {POST_STATUS.map((s) => (
                <option key={s} value={s}>
                  {POST_STATUS_LABELS[s]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="planned">Planeado para</Label>
            <Input
              id="planned"
              type="datetime-local"
              value={plannedAt}
              onChange={(e) => setPlannedAt(e.target.value)}
            />
          </div>
          {status === "publicado" && (
            <div className="space-y-2">
              <Label htmlFor="published">Publicado en</Label>
              <Input
                id="published"
                type="datetime-local"
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
            </div>
          )}
        </div>
        {campaigns.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="campaign">Campaña de growth (opcional)</Label>
            <SelectNative
              id="campaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">— Sin campaña —</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </SelectNative>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Métricas (opcional, registro manual)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricInput id="views" label="Views" value={views} onChange={setViews} />
          <MetricInput id="likes" label="Likes" value={likes} onChange={setLikes} />
          <MetricInput
            id="comments"
            label="Comments"
            value={comments}
            onChange={setComments}
          />
          <MetricInput
            id="shares"
            label="Shares"
            value={shares}
            onChange={setShares}
          />
          <MetricInput id="saves" label="Saves" value={saves} onChange={setSaves} />
          <MetricInput id="plays" label="Plays (SC)" value={plays} onChange={setPlays} />
          <MetricInput id="reach" label="Reach" value={reach} onChange={setReach} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notas</Label>
          <Textarea
            id="notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Aprendizajes, qué funcionó, qué no..."
          />
        </div>
      </Card>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        {initial && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isPending}
            className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
          >
            Borrar
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="ml-auto">
          {isPending
            ? "Guardando…"
            : initial
            ? "Guardar cambios"
            : "Crear post"}
        </Button>
      </div>
    </form>
  );
}

function MetricInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-[10px] uppercase tracking-wider">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  );
}
