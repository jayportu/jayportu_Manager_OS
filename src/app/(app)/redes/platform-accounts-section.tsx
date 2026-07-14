"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { GlassPanel, Badge, Alert } from "@/components/hos";
import { RefreshCw, Trash2, Check, AlertCircle } from "lucide-react";
import {
  saveSoundCloudAccountAction,
  saveYouTubeAccountAction,
  deletePlatformAccountAction,
  syncNowAction,
} from "./platform-accounts-actions";
import type { PlatformAccount } from "@/types/database";
import { relativeTime } from "@/lib/format";

interface Props {
  accounts: PlatformAccount[];
}

export function PlatformAccountsSection({ accounts }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const soundcloud = accounts.find((a) => a.platform === "soundcloud");
  const [scUsername, setScUsername] = useState(soundcloud?.username || "");

  const youtube = accounts.find((a) => a.platform === "youtube");
  const [ytHandle, setYtHandle] = useState(youtube?.username || "");

  function saveSC() {
    setError(null);
    setInfo(null);
    if (!scUsername.trim()) {
      setError("Ingresa un username");
      return;
    }
    startTransition(async () => {
      const r = await saveSoundCloudAccountAction({
        username: scUsername,
        auto_sync_enabled: true,
      });
      if (r.ok) {
        setInfo("Guardado. Pulsa 'Sincronizar ahora' para traer la data.");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  async function removeSC() {
    const { ok } = await confirm({
      title: "¿Quitar la cuenta de SoundCloud?",
      message: "Los snapshots ya guardados quedan, pero deja de sincronizar.",
      variant: "warning",
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    startTransition(async () => {
      await deletePlatformAccountAction("soundcloud");
      setScUsername("");
      setInfo(null);
      router.refresh();
    });
  }

  function saveYT() {
    setError(null);
    setInfo(null);
    if (!ytHandle.trim()) {
      setError("Ingresa el handle o URL de tu canal de YouTube");
      return;
    }
    startTransition(async () => {
      const r = await saveYouTubeAccountAction({
        handle: ytHandle,
        auto_sync_enabled: true,
      });
      if (r.ok) {
        setInfo("Guardado. Pulsa 'Sincronizar ahora' para traer la data.");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  async function removeYT() {
    const { ok } = await confirm({
      title: "¿Quitar la cuenta de YouTube?",
      message: "Los snapshots ya guardados quedan, pero deja de sincronizar.",
      variant: "warning",
      confirmLabel: "Quitar",
    });
    if (!ok) return;
    startTransition(async () => {
      await deletePlatformAccountAction("youtube");
      setYtHandle("");
      setInfo(null);
      router.refresh();
    });
  }

  function syncNow() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const r = await syncNowAction();
      if (r.ok) {
        if (r.data.error_count > 0) {
          setError(
            `Sincronizado: ${r.data.ok_count} ok, ${r.data.error_count} con error. Revisa "Último error".`
          );
        } else {
          setInfo(`Sincronizado: ${r.data.ok_count} cuentas actualizadas`);
        }
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <GlassPanel>
      <div className="space-y-5">
        {/* SoundCloud */}
        <div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 font-display text-xl leading-none tracking-tight">
                SoundCloud
                {soundcloud && <Badge tone="up">conectado</Badge>}
              </h3>
              <p className="mt-1.5 text-xs text-white/55">
                Auto-sync diario de followers, tracks y likes (scraping HTML público)
              </p>
            </div>
            {soundcloud && (
              <Button
                variant="clay"
                size="sm"
                onClick={removeSC}
                disabled={isPending}
                className="shrink-0 text-danger hover:text-danger"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="sc-username" className="text-xs">
                Username o URL
              </Label>
              <Input
                id="sc-username"
                value={scUsername}
                onChange={(e) => setScUsername(e.target.value)}
                placeholder="jay_portu  o  https://soundcloud.com/jay_portu"
                disabled={isPending}
              />
            </div>
            <Button onClick={saveSC} disabled={isPending} size="sm" variant="clayPrimary">
              {soundcloud ? "Actualizar" : "Conectar"}
            </Button>
          </div>

          {soundcloud && (
            <div className="mt-3 space-y-1 text-xs text-white/55">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {soundcloud.last_followers !== null && (
                  <span>
                    Followers: <strong className="text-white">{soundcloud.last_followers.toLocaleString("es-CL")}</strong>
                  </span>
                )}
                {soundcloud.last_track_count !== null && (
                  <span>
                    Tracks: <strong className="text-white">{soundcloud.last_track_count}</strong>
                  </span>
                )}
                {soundcloud.last_synced_at && (
                  <span>
                    Última sync: <strong className="text-white">{relativeTime(soundcloud.last_synced_at)}</strong>
                  </span>
                )}
              </div>
              {soundcloud.last_error && (
                <div className="mt-2 flex items-start gap-1.5 text-danger">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Último error: {soundcloud.last_error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* YouTube */}
        <div className="border-t border-white/10 pt-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 font-display text-xl leading-none tracking-tight">
                YouTube
                {youtube && <Badge tone="up">conectado</Badge>}
              </h3>
              <p className="mt-1.5 text-xs text-white/55">
                Auto-sync diario de suscriptores, videos y views (YouTube Data API v3)
              </p>
            </div>
            {youtube && (
              <Button
                variant="clay"
                size="sm"
                onClick={removeYT}
                disabled={isPending}
                className="shrink-0 text-danger hover:text-danger"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="yt-handle" className="text-xs">
                Handle o URL del canal
              </Label>
              <Input
                id="yt-handle"
                value={ytHandle}
                onChange={(e) => setYtHandle(e.target.value)}
                placeholder="@JayPortu  o  https://youtube.com/@JayPortu"
                disabled={isPending}
              />
            </div>
            <Button onClick={saveYT} disabled={isPending} size="sm" variant="clayPrimary">
              {youtube ? "Actualizar" : "Conectar"}
            </Button>
          </div>

          {youtube && (
            <div className="mt-3 space-y-1 text-xs text-white/55">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {youtube.last_followers !== null && (
                  <span>
                    Suscriptores: <strong className="text-white">{youtube.last_followers.toLocaleString("es-CL")}</strong>
                  </span>
                )}
                {youtube.last_track_count !== null && (
                  <span>
                    Videos: <strong className="text-white">{youtube.last_track_count}</strong>
                  </span>
                )}
                {youtube.last_synced_at && (
                  <span>
                    Última sync: <strong className="text-white">{relativeTime(youtube.last_synced_at)}</strong>
                  </span>
                )}
              </div>
              {youtube.last_error && (
                <div className="mt-2 flex items-start gap-1.5 text-danger">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Último error: {youtube.last_error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync action */}
        {accounts.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <p className="text-xs text-white/55">
              Sincronización automática diaria. También puedes forzar ahora.
            </p>
            <Button
              onClick={syncNow}
              disabled={isPending}
              variant="clay"
              size="sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              Sincronizar ahora
            </Button>
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}
        {info && (
          <Alert tone="success">
            <span className="flex items-start gap-2">
              <Check className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{info}</span>
            </span>
          </Alert>
        )}
      </div>
    </GlassPanel>
  );
}
