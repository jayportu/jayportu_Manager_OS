"use client";

/**
 * Sprint 21 — Editor de tracklist (cliente).
 *
 * Lista de tracks con CRUD inline, drag&drop nativo HTML5 para reordenar,
 * KPIs en vivo (total, BPM avg, duración estimada), import CSV
 * (Rekordbox/Serato/Traktor) y botones de export (PNG story, SC text).
 */

import { useState, useTransition, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  TRACK_TAGS,
  TRACK_TAG_LABELS,
  type Tracklist,
  type TracklistTrack,
  type TrackTag,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Upload,
  GripVertical,
  Download,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import Link from "next/link";
import {
  addTrackAction,
  updateTrackAction,
  deleteTrackAction,
  bulkImportTracksAction,
  reorderTracksAction,
} from "./actions";
import { parseTracklistCsv } from "@/lib/tracklist-csv-parser";

interface Props {
  tracklistId: string;
  calendarEventId: string;
  initialTracklist: Tracklist;
  initialTracks: TracklistTrack[];
  autoPost: { enabled: boolean; hasUrl: boolean };
}

interface Draft {
  artist: string;
  title: string;
  label: string;
  bpm: string;
  music_key: string;
  tag: TrackTag | "";
}

const EMPTY_DRAFT: Draft = {
  artist: "",
  title: "",
  label: "",
  bpm: "",
  music_key: "",
  tag: "",
};

export function TracklistEditor({
  tracklistId,
  calendarEventId,
  initialTracklist,
  initialTracks,
  autoPost,
}: Props) {
  const router = useRouter();
  const [tracks, setTracks] = useState<TracklistTrack[]>(initialTracks);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState<Record<string, Partial<Draft>>>({});
  const [message, setMessage] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);
  const [importPreview, setImportPreview] = useState<{
    format: string;
    tracks: ReturnType<typeof parseTracklistCsv>["tracks"];
    errors: string[];
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scCopied, setScCopied] = useState(false);
  const [webhookFiring, setWebhookFiring] = useState(false);
  const [webhookResult, setWebhookResult] = useState<
    { ok: boolean; text: string } | null
  >(null);

  // KPIs en vivo
  const kpis = useMemo(() => {
    const totalTracks = tracks.length;
    const bpmList = tracks
      .map((t) => t.bpm)
      .filter((b): b is number => b !== null);
    const bpmAvg =
      bpmList.length > 0
        ? Math.round(
            (bpmList.reduce((s, b) => s + b, 0) / bpmList.length) * 10
          ) / 10
        : null;
    const durationMin = totalTracks > 0 ? totalTracks * 18 : 0;
    const hours = Math.floor(durationMin / 60);
    const mins = durationMin % 60;
    const durationLabel =
      totalTracks > 0
        ? `~${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}h`
        : "—";
    const bpmMin = bpmList.length > 0 ? Math.min(...bpmList) : null;
    const bpmMax = bpmList.length > 0 ? Math.max(...bpmList) : null;
    return { totalTracks, bpmAvg, durationLabel, bpmMin, bpmMax };
  }, [tracks]);

  function handleAdd() {
    if (!draft.artist.trim() && !draft.title.trim()) {
      setMessage({ type: "err", text: "Pon artista y/o título." });
      return;
    }
    setMessage(null);
    const bpmNum = draft.bpm ? parseFloat(draft.bpm.replace(",", ".")) : null;
    startTransition(async () => {
      const result = await addTrackAction({
        tracklist_id: tracklistId,
        artist: draft.artist.trim(),
        title: draft.title.trim(),
        label: draft.label.trim(),
        bpm: bpmNum !== null && Number.isFinite(bpmNum) ? bpmNum : null,
        music_key: draft.music_key.trim().toUpperCase(),
        tag: draft.tag || null,
      });
      if (result.ok) {
        setTracks((prev) => [...prev, result.track]);
        setDraft(EMPTY_DRAFT);
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  function startEdit(track: TracklistTrack) {
    setEditing((e) => ({
      ...e,
      [track.id]: {
        artist: track.artist,
        title: track.title,
        label: track.label,
        bpm: track.bpm !== null ? String(track.bpm) : "",
        music_key: track.music_key,
        tag: (track.tag ?? "") as Draft["tag"],
      },
    }));
  }

  function cancelEdit(id: string) {
    setEditing((e) => {
      const copy = { ...e };
      delete copy[id];
      return copy;
    });
  }

  function saveEdit(track: TracklistTrack) {
    const ed = editing[track.id];
    if (!ed) return;
    const bpmNum = ed.bpm ? parseFloat(ed.bpm.replace(",", ".")) : null;
    setMessage(null);
    startTransition(async () => {
      const result = await updateTrackAction(track.id, {
        artist: ed.artist?.trim(),
        title: ed.title?.trim(),
        label: ed.label?.trim(),
        bpm: bpmNum !== null && Number.isFinite(bpmNum) ? bpmNum : null,
        music_key: ed.music_key?.trim().toUpperCase(),
        tag: (ed.tag || null) as TrackTag | null,
      });
      if (result.ok) {
        setTracks((prev) =>
          prev.map((t) => (t.id === track.id ? result.track : t))
        );
        cancelEdit(track.id);
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  function handleDelete(track: TracklistTrack) {
    if (!confirm(`¿Borrar "${track.artist} - ${track.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteTrackAction(track.id);
      if (result.ok) {
        setTracks((prev) => prev.filter((t) => t.id !== track.id));
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  // ── Drag & drop reorder ────────────────────────────────────────
  const dragId = useRef<string | null>(null);
  function onDragStart(id: string) {
    dragId.current = id;
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function onDrop(targetId: string) {
    if (!dragId.current || dragId.current === targetId) return;
    const fromIdx = tracks.findIndex((t) => t.id === dragId.current);
    const toIdx = tracks.findIndex((t) => t.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const reordered = [...tracks];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    // Optimistic
    const withOrder = reordered.map((t, i) => ({ ...t, sort_order: i + 1 }));
    setTracks(withOrder);
    dragId.current = null;
    startTransition(async () => {
      const result = await reorderTracksAction(
        tracklistId,
        withOrder.map((t) => ({ id: t.id, sort_order: t.sort_order }))
      );
      if (!result.ok) {
        setMessage({ type: "err", text: result.error });
      } else {
        router.refresh();
      }
    });
  }

  // ── Import CSV ─────────────────────────────────────────────────
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseTracklistCsv(text);
      setImportPreview({
        format: parsed.format,
        tracks: parsed.tracks,
        errors: parsed.errors,
      });
    };
    reader.readAsText(f);
  }

  function confirmImport() {
    if (!importPreview) return;
    const startOrder = tracks.length;
    setMessage(null);
    startTransition(async () => {
      const result = await bulkImportTracksAction(
        tracklistId,
        importPreview.tracks.map((t, i) => ({
          artist: t.artist,
          title: t.title,
          label: t.label,
          bpm: t.bpm,
          music_key: t.music_key,
          sort_order: startOrder + i + 1,
        }))
      );
      if (result.ok) {
        setMessage({
          type: "ok",
          text: `${result.inserted} tracks importados desde ${importPreview.format}.`,
        });
        setImportPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
        // Refrescamos los tracks pidiendo recarga del server
        // (sin server-fetch directo, esperamos al refresh server)
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  // ── Export SoundCloud text ─────────────────────────────────────
  function buildSoundCloudText(): string {
    const lines: string[] = [];
    lines.push(`// ${initialTracklist.title || "Set"}`);
    lines.push(
      `// ${kpis.totalTracks} tracks${kpis.bpmAvg ? ` · ${kpis.bpmAvg} BPM avg` : ""} · ${kpis.durationLabel}`
    );
    lines.push("");
    for (const t of tracks) {
      const n = String(t.sort_order).padStart(2, "0");
      const artist = t.artist || "—";
      const title = t.title || "—";
      const label = t.label ? ` (${t.label})` : "";
      const tagLabel = t.tag ? ` [${t.tag.toUpperCase()}]` : "";
      lines.push(`${n}. ${artist} — ${title}${label}${tagLabel}`);
    }
    lines.push("");
    lines.push("// powered by drop.dj");
    return lines.join("\n");
  }

  async function fireWebhook() {
    if (tracks.length === 0) {
      setWebhookResult({ ok: false, text: "Sin tracks que enviar." });
      return;
    }
    setWebhookFiring(true);
    setWebhookResult(null);
    try {
      const res = await fetch(`/api/tracklist/${tracklistId}/notify`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok: boolean;
        status?: number;
        error?: string;
        tracks_sent?: number;
      };
      if (data.ok) {
        setWebhookResult({
          ok: true,
          text: `Webhook OK (${data.status ?? "200"}) · ${data.tracks_sent ?? tracks.length} tracks enviados.`,
        });
      } else {
        setWebhookResult({
          ok: false,
          text: data.error || "El webhook respondió con error.",
        });
      }
    } catch {
      setWebhookResult({ ok: false, text: "Error de red al enviar." });
    } finally {
      setWebhookFiring(false);
    }
  }

  async function copySoundCloud() {
    const text = buildSoundCloudText();
    try {
      await navigator.clipboard.writeText(text);
      setScCopied(true);
      setTimeout(() => setScCopied(false), 2500);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setScCopied(true);
      setTimeout(() => setScCopied(false), 2500);
    }
  }

  return (
    <div className="space-y-5">
      {/* KPIs en vivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-2 border-ink">
        <Kpi label="TRACKS" value={String(kpis.totalTracks).padStart(2, "0")} bg="bg-orange" />
        <Kpi
          label="BPM AVG"
          value={kpis.bpmAvg !== null ? String(kpis.bpmAvg) : "—"}
          bg="bg-white"
          sub={
            kpis.bpmMin !== null && kpis.bpmMax !== null
              ? `${kpis.bpmMin}–${kpis.bpmMax}`
              : "—"
          }
        />
        <Kpi
          label="DURACIÓN"
          value={kpis.durationLabel}
          bg="bg-white"
          sub="estimado · 18min/track"
        />
        <Kpi
          label="TAGS"
          value={String(tracks.filter((t) => t.tag).length).padStart(2, "0")}
          bg="bg-ink"
          fg="text-cream"
          sub={`${tracks.filter((t) => t.tag === "peak").length} peak`}
        />
      </div>

      {/* Acciones rápidas */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Importar CSV (Rekordbox/Serato/Traktor)
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.tsv"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          onClick={copySoundCloud}
          disabled={tracks.length === 0}
        >
          {scCopied ? (
            <>
              <Check className="w-4 h-4 mr-1.5" /> Copiado
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1.5" /> Copiar texto SoundCloud
            </>
          )}
        </Button>
        <a
          href={`/api/tracklist/${tracklistId}/story.png`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 h-10 px-4 border-2 border-ink bg-cream hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
        >
          <Download className="w-4 h-4" />
          Bajar PNG · IG Story
        </a>
        {autoPost.enabled && autoPost.hasUrl ? (
          <Button
            type="button"
            variant="orange"
            onClick={fireWebhook}
            disabled={webhookFiring || tracks.length === 0}
          >
            <Zap className="w-4 h-4 mr-1.5" />
            {webhookFiring ? "Enviando…" : "Enviar al webhook"}
          </Button>
        ) : (
          <Link
            href="/configuracion#auto-post"
            className="inline-flex items-center gap-1.5 h-10 px-4 border-2 border-ink/30 bg-cream/50 hover:border-ink text-fg-muted hover:text-ink font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
            title="Configura el webhook en /configuracion para enviar"
          >
            <Zap className="w-4 h-4" />
            Webhook desactivado
          </Link>
        )}
      </div>

      {webhookResult && (
        <div
          className={`text-sm border-2 p-3 ${
            webhookResult.ok
              ? "border-success bg-success/10 text-success"
              : "border-danger bg-danger/10 text-danger"
          }`}
        >
          {webhookResult.text}
        </div>
      )}

      {/* Preview de import */}
      {importPreview && (
        <Card className="p-4 border-2 border-orange bg-orange/5">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-orange mb-2">
            Preview · {importPreview.format} · {importPreview.tracks.length} tracks
          </div>
          {importPreview.errors.length > 0 && (
            <div className="text-xs text-danger mb-2">
              {importPreview.errors.join(" · ")}
            </div>
          )}
          <div className="max-h-48 overflow-auto text-xs font-mono space-y-0.5 bg-white border-2 border-ink p-2">
            {importPreview.tracks.slice(0, 25).map((t, i) => (
              <div key={i}>
                {String(i + 1).padStart(2, "0")}. {t.artist || "—"} — {t.title || "—"}
                {t.bpm !== null && ` · ${t.bpm} BPM`}
                {t.music_key && ` · ${t.music_key}`}
              </div>
            ))}
            {importPreview.tracks.length > 25 && (
              <div className="text-fg-subtle">…+{importPreview.tracks.length - 25} más</div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              type="button"
              variant="orange"
              onClick={confirmImport}
              disabled={isPending || importPreview.tracks.length === 0}
            >
              Importar {importPreview.tracks.length} tracks
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setImportPreview(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {message && (
        <div
          className={`text-sm ${
            message.type === "ok" ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Lista de tracks */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-ink text-cream px-4 py-2 grid grid-cols-12 gap-2 font-mono text-[10px] font-bold uppercase tracking-wider">
          <div className="col-span-1">#</div>
          <div className="col-span-3">Artista</div>
          <div className="col-span-4">Título</div>
          <div className="col-span-1">BPM</div>
          <div className="col-span-1">Key</div>
          <div className="col-span-1">Tag</div>
          <div className="col-span-1 text-right">—</div>
        </div>
        {tracks.length === 0 && (
          <div className="p-8 text-center text-sm text-fg-muted">
            Aún no hay tracks. Agrega abajo o importa un CSV.
          </div>
        )}
        {tracks.map((track, idx) => {
          const ed = editing[track.id];
          const isEditing = !!ed;
          return (
            <div
              key={track.id}
              draggable
              onDragStart={() => onDragStart(track.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(track.id)}
              className="border-b border-ink/20 px-4 py-2 grid grid-cols-12 gap-2 items-center group hover:bg-cream cursor-move"
            >
              <div className="col-span-1 flex items-center gap-1 font-mono text-xs text-fg-muted">
                <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                {String(idx + 1).padStart(2, "0")}
              </div>
              {isEditing ? (
                <>
                  <Input
                    value={ed.artist ?? ""}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        [track.id]: { ...s[track.id], artist: e.target.value },
                      }))
                    }
                    className="col-span-3 h-8"
                  />
                  <Input
                    value={ed.title ?? ""}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        [track.id]: { ...s[track.id], title: e.target.value },
                      }))
                    }
                    className="col-span-4 h-8"
                  />
                  <Input
                    value={ed.bpm ?? ""}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        [track.id]: { ...s[track.id], bpm: e.target.value },
                      }))
                    }
                    className="col-span-1 h-8 text-center"
                    placeholder="128"
                  />
                  <Input
                    value={ed.music_key ?? ""}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        [track.id]: { ...s[track.id], music_key: e.target.value },
                      }))
                    }
                    className="col-span-1 h-8 text-center"
                    placeholder="9A"
                  />
                  <SelectNative
                    value={ed.tag ?? ""}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        [track.id]: {
                          ...s[track.id],
                          tag: e.target.value as Draft["tag"],
                        },
                      }))
                    }
                    className="col-span-1 h-8"
                  >
                    <option value="">—</option>
                    {TRACK_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {TRACK_TAG_LABELS[t]}
                      </option>
                    ))}
                  </SelectNative>
                  <div className="col-span-1 flex gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => saveEdit(track)}
                      disabled={isPending}
                      className="h-8 px-2 bg-orange text-ink border-2 border-ink font-mono text-[10px] font-bold uppercase"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEdit(track.id)}
                      className="h-8 px-2 bg-cream border-2 border-ink font-mono text-[10px] font-bold uppercase"
                    >
                      X
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className="col-span-3 text-sm truncate"
                    onClick={() => startEdit(track)}
                  >
                    {track.artist || <span className="text-fg-subtle">—</span>}
                  </div>
                  <div
                    className="col-span-4 text-sm truncate"
                    onClick={() => startEdit(track)}
                  >
                    {track.title || <span className="text-fg-subtle">—</span>}
                  </div>
                  <div
                    className="col-span-1 text-xs text-center font-mono"
                    onClick={() => startEdit(track)}
                  >
                    {track.bpm !== null ? track.bpm : "—"}
                  </div>
                  <div
                    className="col-span-1 text-xs text-center font-mono"
                    onClick={() => startEdit(track)}
                  >
                    {track.music_key || "—"}
                  </div>
                  <div
                    className="col-span-1 text-[10px] font-mono font-bold uppercase"
                    onClick={() => startEdit(track)}
                  >
                    {track.tag ? (
                      <span
                        className={`px-1.5 py-0.5 border border-ink ${
                          track.tag === "peak"
                            ? "bg-orange text-ink"
                            : track.tag === "intro"
                            ? "bg-info text-white"
                            : "bg-ink text-cream"
                        }`}
                      >
                        {track.tag}
                      </span>
                    ) : (
                      <span className="text-fg-subtle">—</span>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleDelete(track)}
                      disabled={isPending}
                      className="h-7 w-7 border border-ink/30 hover:border-danger hover:bg-danger hover:text-white flex items-center justify-center"
                      aria-label="Borrar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Fila para nuevo track */}
        <div className="bg-cream px-4 py-2 grid grid-cols-12 gap-2 items-center border-t-2 border-ink">
          <div className="col-span-1 font-mono text-xs text-fg-muted">
            {String(tracks.length + 1).padStart(2, "0")}
          </div>
          <Input
            value={draft.artist}
            onChange={(e) => setDraft((d) => ({ ...d, artist: e.target.value }))}
            placeholder="Artista"
            className="col-span-3 h-8"
          />
          <Input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Título"
            className="col-span-4 h-8"
          />
          <Input
            value={draft.bpm}
            onChange={(e) => setDraft((d) => ({ ...d, bpm: e.target.value }))}
            placeholder="128"
            className="col-span-1 h-8 text-center"
          />
          <Input
            value={draft.music_key}
            onChange={(e) =>
              setDraft((d) => ({ ...d, music_key: e.target.value }))
            }
            placeholder="9A"
            className="col-span-1 h-8 text-center"
          />
          <SelectNative
            value={draft.tag}
            onChange={(e) =>
              setDraft((d) => ({ ...d, tag: e.target.value as Draft["tag"] }))
            }
            className="col-span-1 h-8"
          >
            <option value="">—</option>
            {TRACK_TAGS.map((t) => (
              <option key={t} value={t}>
                {TRACK_TAG_LABELS[t]}
              </option>
            ))}
          </SelectNative>
          <div className="col-span-1 flex justify-end">
            <Button
              type="button"
              variant="orange"
              onClick={handleAdd}
              disabled={isPending}
              className="h-8 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Sello (opcional, una fila más) */}
        {(draft.artist || draft.title) && (
          <div className="bg-cream px-4 pb-2 grid grid-cols-12 gap-2 items-center">
            <div className="col-span-1" />
            <Input
              value={draft.label}
              onChange={(e) =>
                setDraft((d) => ({ ...d, label: e.target.value }))
              }
              placeholder="Sello (opcional)"
              className="col-span-7 h-8"
            />
            <div className="col-span-4 font-mono text-[10px] text-fg-subtle self-center">
              Enter para agregar más rápido
            </div>
          </div>
        )}
      </Card>

      <div className="text-[10px] font-mono text-fg-subtle">
        ID tracklist: {tracklistId.slice(0, 8)}… · evento: {calendarEventId.slice(0, 8)}…
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  bg,
  fg = "text-ink",
  sub,
}: {
  label: string;
  value: string;
  bg: string;
  fg?: string;
  sub?: string;
}) {
  const isLast = bg === "bg-ink";
  return (
    <div
      className={`${bg} ${fg} p-4 ${
        isLast ? "" : "border-r-2 border-ink"
      }`}
    >
      <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
        — {label}
      </div>
      <div className="font-display text-3xl leading-none mt-2">{value}</div>
      {sub && (
        <div className="font-mono text-[10px] mt-2 opacity-80">{sub}</div>
      )}
    </div>
  );
}
