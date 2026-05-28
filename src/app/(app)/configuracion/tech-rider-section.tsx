"use client";

/**
 * Sprint 21 — Editor del tech rider estructurado.
 *
 * UX: por cada categoría, lista de items + botón "Agregar". Item editable
 * inline. Items "alternativo" se separan visualmente para el rider B.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RIDER_CATEGORIES,
  RIDER_CATEGORY_LABELS,
  type RiderCategory,
  type TechRiderItem,
} from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ListPlus } from "lucide-react";
import {
  addRiderItemAction,
  updateRiderItemAction,
  deleteRiderItemAction,
  clearLegacyTechRiderAction,
} from "./actions";

interface Props {
  initialItems: TechRiderItem[];
  /** Notas legacy del ProfileForm (rider ideal/alt + hospitality libre).
   *  Si existen, se muestran en modo lectura para que el DJ las pase al
   *  editor estructurado. Las columnas siguen en DB hasta migración manual. */
  legacyTechRiderIdeal?: string;
  legacyTechRiderAlt?: string;
  legacyHospitality?: string;
}

const CATEGORY_DESCRIPTIONS: Record<RiderCategory, string> = {
  reproduccion: "CDJ, DJM, controladora, laptop. Lo que va en cabina.",
  mixer: "Mixer principal. Marca + modelo exacto si tienes preferencia.",
  monitores: "Monitores cabina + side-fill si aplica.",
  power_cables: "Tomas, RCA, jack 3.5mm, adaptadores que necesitas.",
  hospitality: "Toalla, agua, snacks, pase de invitados, transporte.",
  otros: "Cualquier cosa que no entra en las otras categorías.",
};

// Modelos sugeridos por categoría (para placeholder y stage plot Tier 2)
const CATEGORY_SUGGESTIONS: Record<RiderCategory, string[]> = {
  reproduccion: [
    "Pioneer CDJ-3000",
    "Pioneer CDJ-2000NXS2",
    "Pioneer XDJ-1000MK2",
    "Denon Prime",
  ],
  mixer: [
    "Pioneer DJM-900NXS2",
    "Pioneer DJM-V10",
    "Allen & Heath Xone:96",
    "Allen & Heath Xone:PX5",
  ],
  monitores: ["Pioneer XPRS12", "Funktion-One F1201", "JBL EON ONE", "Genelec"],
  power_cables: ["RCA-RCA", "Jack 3.5mm a RCA", "Cable de poder schuko"],
  hospitality: [
    "2x toalla blanca",
    "6x agua sin gas",
    "Coca-Cola Zero",
    "Pase +2 invitados",
  ],
  otros: [],
};

export function TechRiderSection({
  initialItems,
  legacyTechRiderIdeal,
  legacyTechRiderAlt,
  legacyHospitality,
}: Props) {
  const hasLegacy =
    (legacyTechRiderIdeal && legacyTechRiderIdeal.trim().length > 0) ||
    (legacyTechRiderAlt && legacyTechRiderAlt.trim().length > 0) ||
    (legacyHospitality && legacyHospitality.trim().length > 0);
  const router = useRouter();
  const [items, setItems] = useState<TechRiderItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);

  // Estado local de drafts: cada item editable inline. Cuando se guarda
  // se reemplaza por el server.
  const [drafts, setDrafts] = useState<
    Record<string, Partial<TechRiderItem>>
  >({});

  // Form nuevo item por categoría
  const [newItem, setNewItem] = useState<
    Record<RiderCategory, { name: string; quantity: string; alt_text: string; note: string }>
  >(() => {
    const obj = {} as Record<
      RiderCategory,
      { name: string; quantity: string; alt_text: string; note: string }
    >;
    for (const c of RIDER_CATEGORIES) {
      obj[c] = { name: "", quantity: "1", alt_text: "", note: "" };
    }
    return obj;
  });

  function setDraft(id: string, patch: Partial<TechRiderItem>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function handleAdd(category: RiderCategory) {
    const form = newItem[category];
    if (!form.name.trim()) {
      setMessage({ type: "err", text: "Pon un nombre al equipo." });
      return;
    }
    const qty = parseInt(form.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      setMessage({ type: "err", text: "Cantidad debe ser mayor a 0." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await addRiderItemAction({
        category,
        name: form.name.trim(),
        quantity: qty,
        alt_text: form.alt_text.trim(),
        note: form.note.trim(),
        sort_order: items.filter((i) => i.category === category).length + 1,
      });
      if (result.ok) {
        setItems((prev) => [...prev, result.item]);
        setNewItem((n) => ({
          ...n,
          [category]: { name: "", quantity: "1", alt_text: "", note: "" },
        }));
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  function handleSave(item: TechRiderItem) {
    const draft = drafts[item.id];
    if (!draft) return;
    setMessage(null);
    startTransition(async () => {
      const result = await updateRiderItemAction(item.id, draft);
      if (result.ok) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? result.item : it))
        );
        setDrafts((d) => {
          const copy = { ...d };
          delete copy[item.id];
          return copy;
        });
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  function handleDelete(item: TechRiderItem) {
    if (!confirm(`¿Borrar "${item.name}" del rider?`)) return;
    setMessage(null);
    startTransition(async () => {
      const result = await deleteRiderItemAction(item.id);
      if (result.ok) {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  function loadDefaults() {
    if (!confirm("¿Cargar un rider de ejemplo? Se agregarán items estándar.")) return;
    setMessage(null);
    startTransition(async () => {
      const defaults: Array<{
        category: RiderCategory;
        name: string;
        quantity: number;
        alt_text?: string;
        sort_order: number;
      }> = [
        { category: "reproduccion", name: "Pioneer CDJ-3000", quantity: 3, alt_text: "Pioneer CDJ-2000NXS2", sort_order: 1 },
        { category: "mixer", name: "Pioneer DJM-900NXS2", quantity: 1, alt_text: "Allen & Heath Xone:96", sort_order: 1 },
        { category: "monitores", name: "Monitor cabina activo", quantity: 2, alt_text: "Cualquier marca profesional", sort_order: 1 },
        { category: "power_cables", name: "RCA-RCA stereo", quantity: 1, sort_order: 1 },
        { category: "power_cables", name: "Jack 3.5mm a RCA", quantity: 1, sort_order: 2 },
        { category: "hospitality", name: "Agua sin gas (500ml)", quantity: 4, sort_order: 1 },
        { category: "hospitality", name: "Toalla limpia", quantity: 1, sort_order: 2 },
      ];
      for (const d of defaults) {
        // Skip si ya existe ese nombre en esa categoría
        const exists = items.some(
          (i) => i.category === d.category && i.name.toLowerCase() === d.name.toLowerCase()
        );
        if (exists) continue;
        const result = await addRiderItemAction(d);
        if (result.ok) {
          setItems((prev) => [...prev, result.item]);
        }
      }
      router.refresh();
    });
  }

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            — TECH RIDER · ESTRUCTURADO
          </div>
          <h2 className="font-display text-3xl leading-none mt-2">
            Tu rider<span className="text-orange">.</span>
          </h2>
          <p className="text-sm text-fg-muted mt-2 max-w-xl">
            Lo que necesitas en cabina. Se muestra organizado en tu press kit
            público y permite generar un stage plot visual automáticamente.
          </p>
        </div>
        {items.length === 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={loadDefaults}
            disabled={isPending}
            className="shrink-0"
          >
            <ListPlus className="w-4 h-4 mr-2" />
            Cargar ejemplo
          </Button>
        )}
      </div>

      {message && (
        <div
          className={`text-sm ${
            message.type === "ok" ? "text-success" : "text-danger"
          }`}
        >
          {message.text}
        </div>
      )}

      {hasLegacy && (
        <div className="border-2 border-accent bg-accent-soft p-4 space-y-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
              — Notas antiguas en tu perfil
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => {
                if (
                  !confirm(
                    "Esto borra el texto libre de tech rider ideal, alternativo y hospitality. La info del editor estructurado de abajo NO se toca. ¿Continuar?"
                  )
                )
                  return;
                setMessage(null);
                startTransition(async () => {
                  const result = await clearLegacyTechRiderAction();
                  if (result.ok) {
                    setMessage({
                      type: "ok",
                      text: "Notas antiguas limpiadas.",
                    });
                    router.refresh();
                  } else {
                    setMessage({ type: "err", text: result.error });
                  }
                });
              }}
              className="shrink-0"
            >
              Limpiar notas antiguas
            </Button>
          </div>
          <p className="text-xs text-fg">
            Antes el tech rider se escribía como texto libre. Esto se va a
            mostrar en tu press kit hasta que pases la info al editor de
            categorías de abajo (más limpio + permite stage plot
            automático). Cuando termines, clickea {"\""}Limpiar notas
            antiguas{"\""}.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {legacyTechRiderIdeal && legacyTechRiderIdeal.trim().length > 0 && (
              <div className="border border-ink bg-cream p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                  IDEAL
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {legacyTechRiderIdeal}
                </div>
              </div>
            )}
            {legacyTechRiderAlt && legacyTechRiderAlt.trim().length > 0 && (
              <div className="border border-ink bg-cream p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                  ALTERNATIVO
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {legacyTechRiderAlt}
                </div>
              </div>
            )}
            {legacyHospitality && legacyHospitality.trim().length > 0 && (
              <div className="border border-ink bg-cream p-3 md:col-span-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-fg-muted mb-2 font-bold">
                  HOSPITALITY
                </div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {legacyHospitality}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {RIDER_CATEGORIES.map((cat) => {
          const catItems = items
            .filter((i) => i.category === cat)
            .sort((a, b) => a.sort_order - b.sort_order);
          return (
            <div key={cat} className="border-2 border-ink">
              <div className="bg-ink text-cream px-4 py-2 flex items-center justify-between">
                <div>
                  <div className="font-mono text-[11px] font-bold uppercase tracking-wider">
                    {RIDER_CATEGORY_LABELS[cat]}
                  </div>
                  <div className="text-[10px] text-cream/60 mt-0.5">
                    {CATEGORY_DESCRIPTIONS[cat]}
                  </div>
                </div>
                <div className="font-mono text-[10px] text-cream/60">
                  {catItems.length} {catItems.length === 1 ? "item" : "items"}
                </div>
              </div>

              <div className="p-3 space-y-2">
                {catItems.map((item) => {
                  const draft = drafts[item.id] ?? {};
                  const editing = Object.keys(draft).length > 0;
                  return (
                    <div
                      key={item.id}
                      className="border border-ink/20 bg-white p-3 space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={draft.quantity ?? item.quantity}
                          onChange={(e) =>
                            setDraft(item.id, {
                              quantity: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="w-16 shrink-0 text-center"
                          aria-label="Cantidad"
                        />
                        <Input
                          value={draft.name ?? item.name}
                          onChange={(e) =>
                            setDraft(item.id, { name: e.target.value })
                          }
                          placeholder="Modelo / nombre"
                          className="flex-1"
                          aria-label="Nombre del equipo"
                        />
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={isPending}
                          className="shrink-0 h-10 w-10 border-2 border-ink hover:bg-danger hover:text-white transition-colors flex items-center justify-center"
                          aria-label="Borrar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input
                          value={draft.alt_text ?? item.alt_text}
                          onChange={(e) =>
                            setDraft(item.id, { alt_text: e.target.value })
                          }
                          placeholder="Alternativo aceptable (opcional)"
                          aria-label="Alternativo"
                        />
                        <Input
                          value={draft.note ?? item.note}
                          onChange={(e) =>
                            setDraft(item.id, { note: e.target.value })
                          }
                          placeholder="Nota (opcional)"
                          aria-label="Nota"
                        />
                      </div>
                      {editing && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="orange"
                            onClick={() => handleSave(item)}
                            disabled={isPending}
                            className="h-8 text-xs"
                          >
                            Guardar cambios
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Form de nuevo item */}
                <div className="border-2 border-dashed border-ink/30 bg-cream p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={newItem[cat].quantity}
                      onChange={(e) =>
                        setNewItem((n) => ({
                          ...n,
                          [cat]: { ...n[cat], quantity: e.target.value },
                        }))
                      }
                      className="w-16 shrink-0 text-center"
                      aria-label="Cantidad nueva"
                    />
                    <Input
                      value={newItem[cat].name}
                      onChange={(e) =>
                        setNewItem((n) => ({
                          ...n,
                          [cat]: { ...n[cat], name: e.target.value },
                        }))
                      }
                      placeholder={
                        CATEGORY_SUGGESTIONS[cat][0] ||
                        "Agregar equipo a esta categoría…"
                      }
                      className="flex-1"
                      aria-label="Nombre nuevo"
                    />
                    <Button
                      type="button"
                      variant="orange"
                      onClick={() => handleAdd(cat)}
                      disabled={isPending || !newItem[cat].name.trim()}
                      className="shrink-0 h-10"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Agregar
                    </Button>
                  </div>
                  {newItem[cat].name && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <Input
                        value={newItem[cat].alt_text}
                        onChange={(e) =>
                          setNewItem((n) => ({
                            ...n,
                            [cat]: { ...n[cat], alt_text: e.target.value },
                          }))
                        }
                        placeholder="Alternativo aceptable (opcional)"
                      />
                      <Input
                        value={newItem[cat].note}
                        onChange={(e) =>
                          setNewItem((n) => ({
                            ...n,
                            [cat]: { ...n[cat], note: e.target.value },
                          }))
                        }
                        placeholder="Nota (opcional)"
                      />
                    </div>
                  )}
                  {CATEGORY_SUGGESTIONS[cat].length > 1 && !newItem[cat].name && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <div className="text-[10px] text-fg-subtle font-mono mr-1 self-center">
                        Sugerencias:
                      </div>
                      {CATEGORY_SUGGESTIONS[cat].slice(0, 4).map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() =>
                            setNewItem((n) => ({
                              ...n,
                              [cat]: { ...n[cat], name: sug },
                            }))
                          }
                          className="text-[10px] font-mono px-2 py-1 border border-ink/30 hover:bg-ink hover:text-cream transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs text-fg-subtle border-t-2 border-ink pt-3">
        Lo que pongas acá reemplaza el campo libre de tech rider del perfil
        básico. Se muestra organizado en tu press kit público y permite armar
        un stage plot visual automáticamente con los modelos de cabina.
      </div>
    </Card>
  );
}
