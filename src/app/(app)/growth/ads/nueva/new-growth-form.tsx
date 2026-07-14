"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Alert } from "@/components/hos";
import {
  SOCIAL_PLATFORM_LABELS,
  AD_PLATFORMS,
  AD_PLATFORM_LABELS,
  type SocialPlatform,
  type AdPlatform,
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
  defaultPaid?: boolean;
}

export function NewGrowthCampaignForm({ baselines, defaultPaid = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Sprint 18 — Tipo: orgánica vs pagada
  const [isPaid, setIsPaid] = useState(defaultPaid);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [platforms, setPlatforms] = useState<Set<SocialPlatform>>(
    new Set<SocialPlatform>(["instagram"])
  );
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [targetEngagement, setTargetEngagement] = useState("");
  const [targetPostsCount, setTargetPostsCount] = useState("");
  const [endDate, setEndDate] = useState("");

  // Sprint 18 — Campos de pauta pagada
  const [platformAds, setPlatformAds] = useState<Set<AdPlatform>>(
    new Set<AdPlatform>()
  );
  const [budgetClp, setBudgetClp] = useState("");
  const [externalUrl, setExternalUrl] = useState("");

  function togglePlatform(p: SocialPlatform) {
    const next = new Set(platforms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPlatforms(next);
  }

  function togglePlatformAd(p: AdPlatform) {
    const next = new Set(platformAds);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPlatformAds(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Pon un nombre.");
      return;
    }
    if (platforms.size === 0) {
      setError("Selecciona al menos una plataforma de tracking.");
      return;
    }
    if (isPaid && platformAds.size === 0) {
      setError("Si la campaña es pagada, marca al menos una plataforma de pauta.");
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
    const budget = budgetClp ? parseInt(budgetClp.replace(/\D/g, ""), 10) : null;
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
        // Pagada
        is_paid: isPaid,
        platform_ads: isPaid ? Array.from(platformAds) : [],
        budget_clp: isPaid && budget && !isNaN(budget) ? budget : null,
        external_url: isPaid && externalUrl ? externalUrl : null,
      });
      if (r.ok) {
        router.push(`/growth/ads/${r.data.id}`);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Tipo: orgánica vs pagada (Sprint 18) */}
      <GlassPanel>
        <div className="space-y-3">
          <MonoLabel>Tipo de campaña</MonoLabel>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsPaid(false)}
              className="rounded-xl border p-3 text-left transition-colors"
              style={
                !isPaid
                  ? {
                      borderColor: "transparent",
                      background: "rgb(var(--drop-orange))",
                      color: "rgb(var(--drop-ink))",
                    }
                  : {
                      borderColor: "rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.03)",
                    }
              }
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                {!isPaid ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
                Orgánica
              </div>
              <div className="mt-1 text-xs opacity-80">
                Crecimiento sin pauta (contenido + outreach).
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIsPaid(true)}
              className="rounded-xl border p-3 text-left transition-colors"
              style={
                isPaid
                  ? {
                      borderColor: "transparent",
                      background: "rgb(var(--drop-orange))",
                      color: "rgb(var(--drop-ink))",
                    }
                  : {
                      borderColor: "rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.03)",
                    }
              }
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                {isPaid ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5" />
                )}
                Pagada · Meta/Google/TikTok
              </div>
              <div className="mt-1 text-xs opacity-80">
                Con pauta pagada. DROP calcula ROI automáticamente.
              </div>
            </button>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Identidad</MonoLabel>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                isPaid
                  ? "Ej: Push IG · pre-promo gigs Mayo"
                  : "Ej: Demo a circuito Santiago"
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Objetivo (en una frase)</Label>
            <Input
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ej: Pasar de 2.2k a 2.5k en IG"
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
        </div>
      </GlassPanel>

      {/* Bloque exclusivo de pauta pagada (Sprint 18) — mantiene su acento */}
      {isPaid && (
        <GlassPanel>
          <div
            className="space-y-4 border-l-2 pl-4"
            style={{ borderColor: "rgb(var(--drop-orange))" }}
          >
            <MonoLabel>Pauta pagada · Info externa</MonoLabel>
            <p className="text-xs text-white/50">
              DROP no crea pauta automáticamente. Tú pautas en Meta/Google/TikTok
              normalmente y registras acá los datos para que DROP calcule tu ROI.
            </p>

            <div className="space-y-2">
              <Label>Plataformas de pauta *</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {AD_PLATFORMS.map((p) => {
                  const active = platformAds.has(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatformAd(p)}
                      className="flex items-center gap-2 rounded-xl border p-2 text-left transition-colors"
                      style={
                        active
                          ? {
                              borderColor: "transparent",
                              background: "rgb(var(--drop-orange))",
                              color: "rgb(var(--drop-ink))",
                            }
                          : {
                              borderColor: "rgba(255,255,255,.12)",
                              background: "rgba(255,255,255,.03)",
                            }
                      }
                    >
                      <span
                        className="flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold"
                        style={{ borderColor: "currentColor" }}
                      >
                        {active ? <Check className="h-3 w-3" /> : ""}
                      </span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                        {AD_PLATFORM_LABELS[p]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Presupuesto total (CLP)</Label>
                <Input
                  id="budget"
                  value={budgetClp}
                  onChange={(e) => {
                    // Acepta sólo dígitos
                    const v = e.target.value.replace(/\D/g, "");
                    setBudgetClp(v ? `$${parseInt(v, 10).toLocaleString("es-CL")}` : "");
                  }}
                  placeholder="$180.000"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ext">Link Ads Manager (opcional)</Label>
                <Input
                  id="ext"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://adsmanager.facebook.com/..."
                />
              </div>
            </div>
          </div>
        </GlassPanel>
      )}

      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Plataformas a trackear</MonoLabel>
          <p className="-mt-2 text-xs text-white/50">
            Dónde vas a medir el crecimiento. DROP toma snapshot inicial automático.
          </p>
          <div className="space-y-3">
            {PLATFORMS_AVAIL.map((p) => {
              const active = platforms.has(p);
              const baseline = baselines[p];
              return (
                <div
                  key={p}
                  className="rounded-xl border p-3 transition-colors"
                  style={
                    active
                      ? {
                          borderColor: "rgba(255,255,255,.25)",
                          background: "rgba(255,255,255,.04)",
                        }
                      : {
                          borderColor: "rgba(255,255,255,.10)",
                          background: "rgba(255,255,255,.02)",
                        }
                  }
                >
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => togglePlatform(p)}
                      className="h-4 w-4 accent-orange"
                    />
                    <span className="text-sm font-semibold">
                      {SOCIAL_PLATFORM_LABELS[p]}
                    </span>
                    {baseline !== undefined && (
                      <span className="ml-2 font-mono text-[10px] text-white/45">
                        hoy: {baseline.toLocaleString("es-CL")} followers
                      </span>
                    )}
                  </label>
                  {active && (
                    <div className="ml-6 mt-2">
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
                            ? `Ej: ${Math.round(baseline * 1.2)}`
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

          <div className="grid gap-3 md:grid-cols-2">
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
              <Label htmlFor="tp">Posts objetivo (opcional)</Label>
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
        </div>
      </GlassPanel>

      {error && (
        <Alert tone="danger" title="Error">
          {error}
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="clay" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" variant="clayPrimary" disabled={isPending}>
          {isPending ? "Creando…" : isPaid ? "Crear campaña pagada →" : "Crear campaña →"}
        </Button>
      </div>
    </form>
  );
}
