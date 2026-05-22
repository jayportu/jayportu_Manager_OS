"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import {
  CAMPAIGN_CHANNELS,
  CAMPAIGN_CHANNEL_LABELS,
  CONTACT_TYPE_LABELS,
  type CampaignChannel,
  type ContactType,
} from "@/types/database";
import { createCampaignAction } from "../actions";
import { scoreColor } from "@/lib/format";

interface Props {
  contacts: Array<{ id: string; name: string; type: ContactType; score: number }>;
  templates: Array<{ id: string; name: string; category: string }>;
}

export function NewCampaignForm({ contacts, templates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>("whatsapp");
  const [templateId, setTemplateId] = useState<string>("");
  const [messageBase, setMessageBase] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<ContactType | "">("");
  const [filterText, setFilterText] = useState("");

  const filtered = contacts.filter((c) => {
    if (filterType && c.type !== filterType) return false;
    if (filterText) {
      const t = filterText.toLowerCase();
      if (!c.name.toLowerCase().includes(t)) return false;
    }
    return true;
  });

  function toggleContact(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((c) => c.id)));
  }
  function selectNone() {
    setSelectedIds(new Set());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Pon un nombre.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Selecciona al menos 1 contacto.");
      return;
    }
    startTransition(async () => {
      const r = await createCampaignAction({
        name,
        goal,
        channel,
        template_id: templateId || null,
        message_base: messageBase,
        contact_ids: Array.from(selectedIds),
      });
      if (r.ok) {
        router.push(`/campanas/${r.data.id}`);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Identidad
        </h2>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Push rooftops sunset Q1 2026"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo</Label>
          <Input
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Ej: Conseguir 3 fechas confirmadas para enero-marzo"
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Canal principal</Label>
            <SelectNative
              id="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value as CampaignChannel)}
            >
              {CAMPAIGN_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CAMPAIGN_CHANNEL_LABELS[c]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="template">Plantilla base (opcional)</Label>
            <SelectNative
              id="template"
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
            >
              <option value="">— Sin plantilla —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="message_base">Mensaje base (opcional)</Label>
          <Textarea
            id="message_base"
            rows={3}
            value={messageBase}
            onChange={(e) => setMessageBase(e.target.value)}
            placeholder="Si no usas plantilla, podés poner aquí el mensaje base que vas a personalizar por contacto."
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Contactos ({selectedIds.size} seleccionados)
          </h2>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={selectAll}
            >
              Seleccionar todos ({filtered.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={selectNone}
            >
              Ninguno
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <Input
            type="search"
            placeholder="Buscar por nombre…"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <SelectNative
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ContactType | "")}
          >
            <option value="">Tipo: todos</option>
            {Object.entries(CONTACT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </SelectNative>
        </div>

        <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-fg-muted p-6">
              Sin contactos. Crea algunos en /crm primero.
            </div>
          ) : (
            <ul>
              {filtered.map((c, idx) => {
                const sc = scoreColor(c.score);
                const checked = selectedIds.has(c.id);
                return (
                  <li
                    key={c.id}
                    className={`${idx > 0 ? "border-t border-border" : ""}`}
                  >
                    <label className="flex items-center gap-3 px-4 py-2.5 hover:bg-bg-subtle cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleContact(c.id)}
                        className="w-4 h-4 accent-accent"
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {c.name}
                          </div>
                          <div className="text-xs text-fg-muted">
                            {CONTACT_TYPE_LABELS[c.type]}
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded shrink-0 ${sc.bg} ${sc.text}`}
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
      </Card>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded p-3">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Creando…"
            : `Crear campaña con ${selectedIds.size} contactos`}
        </Button>
      </div>
    </form>
  );
}
