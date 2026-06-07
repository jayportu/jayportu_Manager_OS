"use client";

/**
 * Sprint 21 — Config del webhook de auto-post (Zapier/Make/n8n).
 *
 * Cuando el DJ guarda una tracklist con auto_post_enabled = true, DROP hace
 * POST al webhook URL con JSON estructurado. El user decide qué hace su Zap
 * con esa data (SoundCloud description, X post, mail al venue, Discord, etc).
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DjProfile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Zap, ZapOff } from "lucide-react";
import { updateAutoPostAction } from "./actions";

interface Props {
  profile: DjProfile;
}

export function AutoPostSection({ profile }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(profile.auto_post_enabled);
  const [url, setUrl] = useState(profile.auto_post_webhook_url ?? "");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<
    { ok: boolean; text: string } | null
  >(null);
  const [message, setMessage] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);

  async function handleSave() {
    setMessage(null);
    // Validar URL básica si está activo
    if (enabled && url.trim()) {
      try {
        const u = new URL(url.trim());
        if (!u.protocol.startsWith("http")) throw new Error();
      } catch {
        setMessage({ type: "err", text: "URL inválida. Debe empezar con https://" });
        return;
      }
    }
    startTransition(async () => {
      const result = await updateAutoPostAction({
        auto_post_enabled: enabled,
        auto_post_webhook_url: url.trim() || null,
      });
      if (result.ok) {
        setMessage({ type: "ok", text: "Guardado." });
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  async function handleTest() {
    if (!url.trim()) {
      setTestResult({ ok: false, text: "Pon una URL primero." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { ok: boolean; status?: number; error?: string };
      if (data.ok) {
        setTestResult({
          ok: true,
          text: `Webhook respondió OK (${data.status ?? "200"}).`,
        });
      } else {
        setTestResult({
          ok: false,
          text: data.error || "El webhook no respondió OK.",
        });
      }
    } catch {
      setTestResult({ ok: false, text: "Error de red al testear." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className="p-6 space-y-5">
      <div>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
          — AUTOMATIZACIÓN · POST-SHOW
        </div>
        <h2 className="font-display text-3xl leading-none mt-2">
          Auto-post<span className="text-orange">.</span>
        </h2>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Cuando guardes una tracklist, DROP hace POST a tu webhook
          (Zapier/Make/n8n) con la data del set en JSON. Tu Zap decide qué
          hacer: subir a SoundCloud, postear en X, mandar mail al venue, etc.
        </p>
      </div>

      {/* Toggle */}
      <div className="border-2 border-ink p-4 flex items-start gap-3">
        <div className="shrink-0">
          {enabled ? (
            <Zap className="w-5 h-5 text-orange" />
          ) : (
            <ZapOff className="w-5 h-5 text-fg-muted" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider">
            {enabled ? "Auto-post ACTIVO" : "Auto-post desactivado"}
          </div>
          <p className="text-xs text-fg-muted mt-1">
            {enabled
              ? "Al guardar una tracklist, DROP envía el POST al webhook."
              : "Las tracklists se guardan sin enviar a ningún lado."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(!enabled)}
          className={`shrink-0 w-14 h-7 border-2 border-ink relative transition-colors ${
            enabled ? "bg-orange" : "bg-cream"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-ink transition-all ${
              enabled ? "left-7" : "left-0.5"
            }`}
          />
        </button>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="webhook-url">Webhook URL (Zapier/Make/n8n)</Label>
        <Input
          id="webhook-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.zapier.com/hooks/catch/..."
        />
        <div className="text-[10px] text-fg-subtle">
          Soportamos cualquier endpoint HTTPS que acepte POST con JSON.
        </div>
      </div>

      {/* Test webhook */}
      <div className="border-2 border-ink/20 bg-cream p-3 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={!url.trim() || testing}
          className="shrink-0"
        >
          {testing ? "Probando…" : "Probar webhook"}
        </Button>
        {testResult && (
          <div
            className={`text-xs ${
              testResult.ok ? "text-success" : "text-danger"
            }`}
          >
            {testResult.text}
          </div>
        )}
        {!testResult && (
          <div className="text-[10px] text-fg-subtle">
            Envía un payload de muestra. Confirma que tu Zap recibe la data.
          </div>
        )}
      </div>

      <details className="text-xs text-fg-muted">
        <summary className="cursor-pointer font-mono uppercase tracking-wider text-[10px]">
          Ver payload JSON que recibe el webhook
        </summary>
        <pre className="mt-2 p-3 bg-ink text-cream text-[10px] overflow-auto font-mono">{`{
  "event": "tracklist.saved",
  "dj": { "artist_name": "...", "city": "..." },
  "tracklist": {
    "id": "...",
    "title": "...",
    "venue": "...",
    "event_date": "2025-05-25",
    "total_tracks": 24,
    "bpm_avg": 128,
    "duration_minutes": 432
  },
  "tracks": [
    { "n": 1, "artist": "...", "title": "...", "label": "...", "bpm": 126, "tag": "intro" },
    ...
  ],
  "soundcloud_text": "// formato 1001Tracklists paste-ready",
  "presskit_url": "https://dropgigs.com/p/jayportu"
}`}</pre>
      </details>

      {message && (
        <div
          className={`text-sm ${
            message.type === "ok" ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t-2 border-ink">
        <Button onClick={handleSave} disabled={isPending} variant="orange">
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Card>
  );
}
