"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2, Plus, Check, Link2 } from "lucide-react";
import type { LibLink } from "@/lib/queries/link-in-bio";
import {
  addLinkAction,
  updateLinkAction,
  deleteLinkAction,
  setActiveAction,
  moveLinkAction,
} from "./actions";
import { cn } from "@/lib/utils";
import {
  GlassPanel,
  MonoLabel,
  EmptyState,
  ClayChipButton,
  Alert,
  FIELD,
} from "@/components/hos";
import { Button } from "@/components/ui/button";

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
    <GlassPanel>
      <MonoLabel>Tus links</MonoLabel>

      <div className="mt-4">
        {initialLinks.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="Aún no tienes links"
            sub="Agrega el primero abajo: un nombre y una URL."
          />
        ) : (
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
        )}

        {/* Agregar link */}
        <div
          className="mt-4 flex flex-col gap-2 rounded-xl border border-white/10 p-3 sm:flex-row sm:items-end"
          style={{ background: "rgba(255,255,255,.02)" }}
        >
          <div className="flex-1">
            <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">
              Nombre
            </label>
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej. Entradas próximo show"
              className={FIELD}
            />
          </div>
          <div className="flex-1">
            <label className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40">
              URL
            </label>
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://…"
              className={cn(FIELD, "font-mono")}
            />
          </div>
          <Button
            type="button"
            variant="clayPrimary"
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
          >
            <Plus className="w-3.5 h-3.5" /> Agregar
          </Button>
        </div>

        {err && (
          <div className="mt-3">
            <Alert tone="danger">{err}</Alert>
          </div>
        )}
      </div>
    </GlassPanel>
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
      className={cn(
        "flex items-center gap-2 rounded-xl border border-white/10 p-2.5",
        !link.active && "opacity-50"
      )}
      style={{ background: "rgba(255,255,255,.03)" }}
    >
      <div className="flex shrink-0 flex-col text-white/30">
        <button
          type="button"
          disabled={pending || isFirst}
          onClick={() => onMove("up")}
          className="hover:text-white disabled:opacity-25"
          title="Subir"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          disabled={pending || isLast}
          onClick={() => onMove("down")}
          className="hover:text-white disabled:opacity-25"
          title="Bajar"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className={cn(FIELD, "mb-1 !py-1 !text-[13px] font-sans")}
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className={cn(FIELD, "!py-1 !text-[11px]")}
        />
      </div>

      {dirty && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave(label, url)}
          className="shrink-0 text-[rgb(var(--drop-orange))] hover:opacity-80"
          title="Guardar cambios"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
      <ClayChipButton active={link.active} onClick={onToggle}>
        {link.active ? "activo" : "oculto"}
      </ClayChipButton>
      <button
        type="button"
        disabled={pending}
        onClick={onDelete}
        className="shrink-0 text-white/40 hover:text-danger disabled:opacity-30"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
