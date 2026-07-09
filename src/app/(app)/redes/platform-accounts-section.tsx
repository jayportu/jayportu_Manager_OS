"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
    <Card className="p-6 space-y-5">
      {/* SoundCloud */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              SoundCloud
              {soundcloud && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 border border-success/30 text-success">
                  conectado
                </span>
              )}
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Auto-sync diario de followers, tracks y likes (scraping HTML público)
            </p>
          </div>
          {soundcloud && (
            <Button
              variant="outline"
              size="sm"
              onClick={removeSC}
              disabled={isPending}
              className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
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
          <Button onClick={saveSC} disabled={isPending} size="sm">
            {soundcloud ? "Actualizar" : "Conectar"}
          </Button>
        </div>

        {soundcloud && (
          <div className="mt-3 text-xs text-fg-muted space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {soundcloud.last_followers !== null && (
                <span>
                  Followers: <strong className="text-fg">{soundcloud.last_followers.toLocaleString("es-CL")}</strong>
                </span>
              )}
              {soundcloud.last_track_count !== null && (
                <span>
                  Tracks: <strong className="text-fg">{soundcloud.last_track_count}</strong>
                </span>
              )}
              {soundcloud.last_synced_at && (
                <span>
                  Última sync: <strong className="text-fg">{relativeTime(soundcloud.last_synced_at)}</strong>
                </span>
              )}
            </div>
            {soundcloud.last_error && (
              <div className="flex items-start gap-1.5 text-danger mt-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Último error: {soundcloud.last_error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* YouTube */}
      <div className="pt-5 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              YouTube
              {youtube && (
                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-success/15 border border-success/30 text-success">
                  conectado
                </span>
              )}
            </h3>
            <p className="text-xs text-fg-muted mt-0.5">
              Auto-sync diario de suscriptores, videos y views (YouTube Data API v3)
            </p>
          </div>
          {youtube && (
            <Button
              variant="outline"
              size="sm"
              onClick={removeYT}
              disabled={isPending}
              className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
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
          <Button onClick={saveYT} disabled={isPending} size="sm">
            {youtube ? "Actualizar" : "Conectar"}
          </Button>
        </div>

        {youtube && (
          <div className="mt-3 text-xs text-fg-muted space-y-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {youtube.last_followers !== null && (
                <span>
                  Suscriptores: <strong className="text-fg">{youtube.last_followers.toLocaleString("es-CL")}</strong>
                </span>
              )}
              {youtube.last_track_count !== null && (
                <span>
                  Videos: <strong className="text-fg">{youtube.last_track_count}</strong>
                </span>
              )}
              {youtube.last_synced_at && (
                <span>
                  Última sync: <strong className="text-fg">{relativeTime(youtube.last_synced_at)}</strong>
                </span>
              )}
            </div>
            {youtube.last_error && (
              <div className="flex items-start gap-1.5 text-danger mt-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Último error: {youtube.last_error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sync action */}
      {accounts.length > 0 && (
        <div className="pt-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs text-fg-muted">
            Sincronización automática diaria. También puedes forzar ahora.
          </p>
          <Button
            onClick={syncNow}
            disabled={isPending}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
            Sincronizar ahora
          </Button>
        </div>
      )}

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-3">
          {error}
        </div>
      )}
      {info && (
        <div className="text-sm text-success bg-success/10 border border-success/30 rounded p-3 flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}
    </Card>
  );
}
