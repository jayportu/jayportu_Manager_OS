"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  SOCIAL_PLATFORM_LABELS,
  type SocialPlatform,
} from "@/types/database";
import { createGrowthCampaignAction } from "../../actions";

const PLATFORMS_AVAIL: SocialPlatform[] = [
  "instagram",
  "youtube",
  "soundcloud",
  "tiktok",
];

interface Props {
  baselines: Record<string, number>;
}

export function NewGrowthCampaignForm({ baselines }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [platforms, setPlatforms] = useState<Set<SocialPlatform>>(
    new Set<SocialPlatform>(["instagram"])
  );
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [targetEngagement, setTargetEngagement] = useState("");
  const [targetPostsCount, setTargetPostsCount] = useState("");
  const [endDate, setEndDate] = useState("");

  function togglePlatform(p: SocialPlatform) {
    const next = new Set(platforms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPlatforms(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Pon un nombre.");
      return;
    }
    if (platforms.size === 0) {
      setError("Selecciona al menos una plataforma.");
      return;
    }
    const target_followers: Record<string, number> = {};
    platforms.forEach((p) => {
      const v = targets[p];
      if (v) {
        const n = parseInt(v, 10);
        if (!isNaN(n)) target_followers[p] = n;
      }
    });
    startTransition(async () => {
      const r = await createGrowthCampaignAction({
        name,
        goal,
        platforms: Array.from(platforms),
        target_followers,
        target_engagement_rate: targetEngagement
          ? parseFloat(targetEngagement)
          : null,
        target_posts_count: targetPostsCount
          ? parseInt(targetPostsCount, 10)
          : null,
        end_date: endDate || null,
      });
      if (r.ok) {
        router.push(`/growth/campanas/${r.data.id}`);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Identidad
        </h2>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Push IG reels · Junio 2026"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo (en una frase)</Label>
          <Input
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Ej: Pasar de 1k a 1.5k seguidores en IG"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">Fecha de término (opcional)</Label>
          <Input
            id="end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Plataformas y objetivos
        </h2>
        <div className="space-y-3">
          {PLATFORMS_AVAIL.map((p) => {
            const active = platforms.has(p);
            const baseline = baselines[p];
            return (
              <div
                key={p}
                className={`p-3 rounded-lg border transition-colors ${
                  active
                    ? "border-accent/30 bg-accent-soft"
                    : "border-border bg-bg"
                }`}
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => togglePlatform(p)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm font-semibold">
                    {SOCIAL_PLATFORM_LABELS[p]}
                  </span>
                  {baseline !== undefined && (
                    <span className="text-[10px] text-fg-subtle ml-2">
                      Hoy: {baseline} seguidores
                    </span>
                  )}
                </label>
                {active && (
                  <div className="mt-2 ml-6">
                    <Label
                      htmlFor={`t-${p}`}
                      className="text-[10px] uppercase tracking-wider"
                    >
                      Objetivo de seguidores
                    </Label>
                    <Input
                      id={`t-${p}`}
                      type="number"
                      inputMode="numeric"
                      min={baseline ?? 0}
                      placeholder={
                        baseline
                          ? `Ej: ${Math.round(baseline * 1.5)}`
                          : "Ej: 1500"
                      }
                      value={targets[p] || ""}
                      onChange={(e) =>
                        setTargets((t) => ({ ...t, [p]: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="te">Engagement target % (opcional)</Label>
            <Input
              id="te"
              type="number"
              step="0.1"
              min={0}
              max={100}
              placeholder="Ej: 5.0"
              value={targetEngagement}
              onChange={(e) => setTargetEngagement(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tp">Cantidad de posts objetivo (opcional)</Label>
            <Input
              id="tp"
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Ej: 12"
              value={targetPostsCount}
              onChange={(e) => setTargetPostsCount(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creando…" : "Crear campaña"}
        </Button>
      </div>
    </form>
  );
}
