"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  CONTACT_TYPE_LABELS,
  type ContactType,
} from "@/types/database";
import { addContactsAction } from "../actions";
import { scoreColor } from "@/lib/format";
import { ClayChipButton, FIELD, SELECT } from "@/components/hos";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string;
  candidates: Array<{
    id: string;
    name: string;
    type: ContactType;
    score: number;
    /** Sprint 19 — tags arbitrarios del contacto */
    tags?: string[];
  }>;
  buttonLabel?: string;
  buttonVariant?: "clay" | "clayPrimary";
}

export function AddContactsDialog({
  campaignId,
  candidates,
  buttonLabel = "+ Agregar contactos",
  buttonVariant = "clay",
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterText, setFilterText] = useState("");
  const [filterType, setFilterType] = useState<ContactType | "">("");
  // Sprint 19 — Filtro por tags (AND)
  const [filterTags, setFilterTags] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function toggleTag(t: string) {
    const next = new Set(filterTags);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setFilterTags(next);
  }

  // Lista de todos los tags disponibles entre los candidatos
  const allTags = Array.from(
    new Set(candidates.flatMap((c) => c.tags ?? []))
  ).sort();

  const filtered = candidates.filter((c) => {
    if (filterType && c.type !== filterType) return false;
    if (filterText && !c.name.toLowerCase().includes(filterText.toLowerCase()))
      return false;
    // Sprint 19 — AND de tags: el contacto debe tener TODOS los filtrados
    if (filterTags.size > 0) {
      const ctags = c.tags ?? [];
      const tagsArray = Array.from(filterTags);
      for (const t of tagsArray) {
        if (!ctags.includes(t)) return false;
      }
    }
    return true;
  });

  function handleAdd() {
    if (selectedIds.size === 0) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      const r = await addContactsAction(campaignId, Array.from(selectedIds));
      if (r.ok) {
        setOpen(false);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        await confirm({
          title: "Error",
          message: r.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
      }
    });
  }

  return (
    <>
      <Button size="sm" variant={buttonVariant} onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        {buttonLabel}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl leading-none text-fg">
                Agregar contactos<span className="text-orange">.</span>
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-fg-muted hover:text-fg"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-2 mb-3">
              <input
                type="search"
                aria-label="Buscar nombre"
                placeholder="Buscar nombre…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className={FIELD}
              />
              <select
                aria-label="Tipo"
                className={SELECT}
                value={filterType}
                onChange={(e) =>
                  setFilterType(e.target.value as ContactType | "")
                }
              >
                <option value="" className="bg-bg-panel">
                  Tipo: todos
                </option>
                {Object.entries(CONTACT_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-bg-panel">
                    {v}
                  </option>
                ))}
              </select>
            </div>

            {/* Sprint 19 — Filtro por tags (AND) */}
            {allTags.length > 0 && (
              <div className="mb-3 rounded-xl border border-dashed border-white/15 p-3">
                <div className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-orange">
                  <span aria-hidden>— </span>Filtrar por tags (AND)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.slice(0, 30).map((t) => {
                    const active = filterTags.has(t);
                    return (
                      <ClayChipButton
                        key={t}
                        active={active}
                        onClick={() => toggleTag(t)}
                      >
                        #{t}
                        {active && <span className="ml-1.5">×</span>}
                      </ClayChipButton>
                    );
                  })}
                  {filterTags.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterTags(new Set())}
                      className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 underline text-fg-muted hover:text-fg"
                    >
                      limpiar
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto border border-border rounded-xl mb-3">
              {filtered.length === 0 ? (
                <div className="text-center text-sm text-fg-muted p-6">
                  No quedan contactos disponibles para agregar.
                </div>
              ) : (
                <ul>
                  {filtered.map((c, i) => {
                    const sc = scoreColor(c.score);
                    const checked = selectedIds.has(c.id);
                    return (
                      <li
                        key={c.id}
                        className={i > 0 ? "border-t border-border" : ""}
                      >
                        <label className="flex items-center gap-3 px-3 py-2 hover:bg-bg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(c.id)}
                            className="w-4 h-4 accent-accent"
                          />
                          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">
                                {c.name}
                              </div>
                              <div className="text-[11px] text-fg-muted">
                                {CONTACT_TYPE_LABELS[c.type]}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider shrink-0",
                                sc.bg,
                                sc.text
                              )}
                            >
                              {c.score}
                            </span>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-between items-center gap-2">
              <div className="text-xs text-fg-muted">
                {selectedIds.size} seleccionados
              </div>
              <div className="flex gap-2">
                <Button
                  variant="clay"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
                <Button
                  variant="clayPrimary"
                  onClick={handleAdd}
                  disabled={isPending || selectedIds.size === 0}
                >
                  {isPending ? "Agregando…" : `Agregar ${selectedIds.size}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
