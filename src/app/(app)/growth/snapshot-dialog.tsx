"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, X } from "lucide-react";
import {
  SOCIAL_PLATFORM_LABELS,
  type PlatformSnapshot,
  type SocialPlatform,
} from "@/types/database";
import { Alert } from "@/components/hos";
import { saveSnapshotsAction } from "./actions";

// Solo las principales para Jaime (puede ampliar después)
const PLATFORMS_TO_SHOW: SocialPlatform[] = [
  "instagram",
  "youtube",
  "soundcloud",
  "tiktok",
];

interface Props {
  existingSnapshots: Record<string, PlatformSnapshot | null>;
  buttonLabel?: string;
  buttonVariant?: "default" | "outline" | "ghost";
}

export function SnapshotDialog({
  existingSnapshots,
  buttonLabel = "Actualizar stats",
  buttonVariant = "default",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado: por plataforma, followers + engagement
  const [values, setValues] = useState<
    Record<string, { followers: string; engagement_rate: string }>
  >(() => {
    const initial: Record<string, { followers: string; engagement_rate: string }> = {};
    for (const p of PLATFORMS_TO_SHOW) {
      initial[p] = {
        followers: existingSnapshots[p]?.followers?.toString() ?? "",
        engagement_rate:
          existingSnapshots[p]?.engagement_rate?.toString() ?? "",
      };
    }
    return initial;
  });

  function update(
    platform: SocialPlatform,
    field: "followers" | "engagement_rate",
    value: string
  ) {
    setValues((v) => ({
      ...v,
      [platform]: { ...v[platform], [field]: value },
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const snapshots = PLATFORMS_TO_SHOW.map((p) => {
      const v = values[p];
      const followers = v.followers ? parseInt(v.followers, 10) : null;
      const er = v.engagement_rate ? parseFloat(v.engagement_rate) : null;
      return {
        platform: p,
        followers: !isNaN(followers ?? NaN) ? followers : null,
        engagement_rate: !isNaN(er ?? NaN) ? er : null,
      };
    }).filter((s) => s.followers !== null || s.engagement_rate !== null);

    if (snapshots.length === 0) {
      setError("Pon al menos un valor.");
      return;
    }

    startTransition(async () => {
      const r = await saveSnapshotsAction(snapshots);
      if (r.ok) {
        setOpen(false);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <Button
        size="sm"
        variant={buttonVariant}
        onClick={() => setOpen(true)}
      >
        <TrendingUp className="w-4 h-4" />
        {buttonLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="hos-glass w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl leading-none">
                Actualizar stats de mis cuentas
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-white/50 mb-4">
              Pon los valores actuales que ves en cada app. Cada vez que
              guardes se crea un snapshot — así vemos evolución.
            </p>

            <form onSubmit={handleSave} className="space-y-4">
              {PLATFORMS_TO_SHOW.map((p) => {
                const prev = existingSnapshots[p];
                return (
                  <div
                    key={p}
                    className="rounded-xl border border-white/10 p-3"
                    style={{ background: "rgba(255,255,255,.03)" }}
                  >
                    <div className="text-sm font-semibold mb-2">
                      {SOCIAL_PLATFORM_LABELS[p]}
                      {prev && (
                        <span className="text-[10px] text-white/40 ml-2 font-normal">
                          (anterior: {prev.followers ?? "—"} followers)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`f-${p}`}
                          className="text-[10px] uppercase tracking-wider"
                        >
                          Seguidores
                        </Label>
                        <Input
                          id={`f-${p}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          placeholder="Ej: 1250"
                          value={values[p].followers}
                          onChange={(e) =>
                            update(p, "followers", e.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`e-${p}`}
                          className="text-[10px] uppercase tracking-wider"
                        >
                          Engagement % (opcional)
                        </Label>
                        <Input
                          id={`e-${p}`}
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min={0}
                          max={100}
                          placeholder="Ej: 4.5"
                          value={values[p].engagement_rate}
                          onChange={(e) =>
                            update(p, "engagement_rate", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {error && <Alert tone="danger">{error}</Alert>}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="clay"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="clayPrimary" disabled={isPending}>
                  {isPending ? "Guardando…" : "Guardar snapshots"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
