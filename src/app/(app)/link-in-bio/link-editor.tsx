"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Plus, Check } from "lucide-react";
import type { LibLink } from "@/lib/queries/link-in-bio";
import {
  addLinkAction,
  updateLinkAction,
  deleteLinkAction,
  setActiveAction,
  moveLinkAction,
} from "./actions";

type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Editor de links (Fase 4). Renderiza desde `initialLinks` (prop del server);
 * tras cada acción, `router.refresh()` re-renderiza el server component con la
 * data fresca. Solo el form de "agregar" y el estado de edición por fila viven
 * en el cliente.
 */
export function LinkEditor({ initialLinks }: { initialLinks: LibLink[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setErr(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  return (
    <div>
      {initialLinks.length === 0 && (
        <p className="text-sm text-fg-muted border-2 border-dashed border-border p-6 text-center mb-4">
          Aún no tienes links. Agrega el primero abajo.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {initialLinks.map((l, i) => (
          <LinkRow
            key={l.id}
            link={l}
            isFirst={i === 0}
            isLast={i === initialLinks.length - 1}
            pending={pending}
            onSave={(label, url) => run(() => updateLinkAction(l.id, label, url))}
            onToggle={() => run(() => setActiveAction(l.id, !l.active))}
            onDelete={() => run(() => deleteLinkAction(l.id))}
            onMove={(dir) => run(() => moveLinkAction(l.id, dir))}
          />
        ))}
      </div>

      {/* Agregar link */}
      <div className="mt-4 border-2 border-border p-3 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            Nombre
          </label>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ej. Entradas próximo show"
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            URL
          </label>
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://…"
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent font-mono"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(
              () => addLinkAction(newLabel, newUrl),
              () => {
                setNewLabel("");
                setNewUrl("");
              }
            )
          }
          className="px-4 py-2 bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1 justify-center"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {err && <div className="text-xs text-danger mt-2">{err}</div>}
    </div>
  );
}

function LinkRow({
  link,
  isFirst,
  isLast,
  pending,
  onSave,
  onToggle,
  onDelete,
  onMove,
}: {
  link: LibLink;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  onSave: (label: string, url: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [label, setLabel] = useState(link.label);
  const [url, setUrl] = useState(link.url);
  const dirty = label !== link.label || url !== link.url;

  return (
    <div
      className={`flex items-center gap-2 border-2 border-border p-2 ${
        link.active ? "" : "opacity-50"
      }`}
    >
      <div className="flex flex-col shrink-0">
        <button
          type="button"
          disabled={pending || isFirst}
          onClick={() => onMove("up")}
          className="disabled:opacity-30 text-fg-muted hover:text-fg"
          title="Subir"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={pending || isLast}
          onClick={() => onMove("down")}
          className="disabled:opacity-30 text-fg-muted hover:text-fg"
          title="Bajar"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="w-28 sm:w-36 shrink-0 border border-border bg-bg-panel px-2 py-1 text-sm outline-none focus:border-accent"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 min-w-0 border border-border bg-bg-panel px-2 py-1 text-xs font-mono outline-none focus:border-accent"
      />

      {dirty && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(label, url)}
          className="shrink-0 text-accent hover:opacity-80"
          title="Guardar cambios"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={onToggle}
        className={`shrink-0 text-[9px] font-mono uppercase tracking-wider px-2 py-1 border ${
          link.active
            ? "bg-accent text-white border-accent"
            : "text-fg-muted border-border"
        }`}
      >
        {link.active ? "activo" : "oculto"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="shrink-0 text-danger hover:opacity-80"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
