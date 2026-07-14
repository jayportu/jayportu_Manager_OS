"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { GlassPanel, MonoLabel } from "@/components/hos";
import {
  CONTACT_TYPES,
  CONTACT_STATUS,
  MAIN_CHANNELS,
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
  MAIN_CHANNEL_LABELS,
  isVenueType,
  type Contact,
  type ContactInsert,
  type ContactUpdate,
  type ContactType,
  type ContactStatus,
  type MainChannel,
} from "@/types/database";
import {
  createContactAction,
  updateContactAction,
  deleteContactAction,
} from "./actions";

interface Props {
  /** Si está presente, modo edición. Si no, modo crear. */
  initial?: Contact;
}

const EMPTY: ContactInsert = {
  name: "",
  type: "club",
  city: "Santiago",
  country: "Chile",
  instagram: "",
  whatsapp: "",
  email: "",
  website: "",
  contact_person: "",
  contact_role: "",
  music_style: "",
  main_channel: "whatsapp",
  status: "nuevo",
  notes: "",
  // Sprint 19 — Tags + notas privadas
  tags: [],
  private_notes: "",
  // Sprint 20 — Venue (solo aplica si type IN VENUE_TYPES)
  capacity_estimate: null,
  accepted_genres: [],
};

/** Sprint 19 — Normaliza tag a lowercase + dashes (sin espacios). */
function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function ContactForm({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<ContactInsert>(
    initial
      ? {
          name: initial.name,
          type: initial.type,
          city: initial.city,
          country: initial.country,
          instagram: initial.instagram,
          whatsapp: initial.whatsapp,
          email: initial.email,
          website: initial.website,
          contact_person: initial.contact_person,
          contact_role: initial.contact_role,
          music_style: initial.music_style,
          main_channel: initial.main_channel,
          status: initial.status,
          notes: initial.notes,
          tags: initial.tags ?? [],
          private_notes: initial.private_notes ?? "",
          capacity_estimate: initial.capacity_estimate ?? null,
          accepted_genres: initial.accepted_genres ?? [],
        }
      : EMPTY
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [tagInput, setTagInput] = useState("");

  function addTag(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) return;
    setForm((f) => {
      const current = f.tags ?? [];
      if (current.includes(tag)) return f;
      return { ...f, tags: [...current, tag] };
    });
    setTagInput("");
  }

  function removeTag(tag: string) {
    setForm((f) => ({
      ...f,
      tags: (f.tags ?? []).filter((t) => t !== tag),
    }));
  }

  function update<K extends keyof ContactInsert>(
    field: K,
    value: ContactInsert[K]
  ) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      if (initial) {
        // Update
        const patch: ContactUpdate = { ...form };
        const result = await updateContactAction(initial.id, patch);
        if (result.ok) {
          setMessage({ type: "ok", text: "Guardado." });
          router.refresh();
        } else {
          setMessage({ type: "err", text: result.error });
        }
      } else {
        // Create
        const result = await createContactAction(form);
        if (result.ok) {
          router.push(`/crm/${result.data.id}`);
        } else {
          setMessage({ type: "err", text: result.error });
        }
      }
    });
  }

  async function handleDelete() {
    if (!initial) return;
    const confirmed = confirm(
      `¿Borrar "${initial.name}"? Se borrarán también sus interacciones y follow-ups. Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;
    setIsDeleting(true);
    await deleteContactAction(initial.id);
    // deleteContactAction hace redirect("/crm")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Identidad */}
      <GlassPanel className="space-y-4">
        <MonoLabel>Identidad</MonoLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="Club La Feria"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <SelectNative
              id="type"
              value={form.type}
              onChange={(e) => update("type", e.target.value as ContactType)}
            >
              {CONTACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {CONTACT_TYPE_LABELS[t]}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={form.city || ""}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">País</Label>
            <Input
              id="country"
              value={form.country || ""}
              onChange={(e) => update("country", e.target.value)}
            />
          </div>
        </div>
      </GlassPanel>

      {/* Persona de contacto */}
      <GlassPanel className="space-y-4">
        <MonoLabel>Persona de contacto</MonoLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contact_person">Nombre</Label>
            <Input
              id="contact_person"
              value={form.contact_person || ""}
              onChange={(e) => update("contact_person", e.target.value)}
              placeholder="Camila Pérez"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_role">Cargo</Label>
            <Input
              id="contact_role"
              value={form.contact_role || ""}
              onChange={(e) => update("contact_role", e.target.value)}
              placeholder="Booker"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Canales */}
      <GlassPanel className="space-y-4">
        <MonoLabel>Canales de contacto</MonoLabel>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp (con código país)</Label>
            <Input
              id="whatsapp"
              value={form.whatsapp || ""}
              onChange={(e) => update("whatsapp", e.target.value)}
              placeholder="56988188531"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email || ""}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              value={form.instagram || ""}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="@club_la_feria"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={form.website || ""}
              onChange={(e) => update("website", e.target.value)}
              placeholder="clublaferia.cl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="main_channel">Canal principal</Label>
            <SelectNative
              id="main_channel"
              value={form.main_channel}
              onChange={(e) => update("main_channel", e.target.value as MainChannel)}
            >
              {MAIN_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {MAIN_CHANNEL_LABELS[c]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="music_style">Estilo musical / vibe</Label>
            <Input
              id="music_style"
              value={form.music_style || ""}
              onChange={(e) => update("music_style", e.target.value)}
              placeholder="Tech House, House"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Pipeline */}
      <GlassPanel className="space-y-4">
        <MonoLabel>Pipeline</MonoLabel>
        <div className="space-y-2">
          <Label htmlFor="status">Estado</Label>
          <SelectNative
            id="status"
            value={form.status}
            onChange={(e) => update("status", e.target.value as ContactStatus)}
          >
            {CONTACT_STATUS.map((s) => (
              <option key={s} value={s}>
                {CONTACT_STATUS_LABELS[s]}
              </option>
            ))}
          </SelectNative>
        </div>
        {initial && (
          <div className="p-3 rounded-lg bg-bg border border-border">
            <div className="text-xs text-fg-muted mb-1">
              Score automático actual
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display text-2xl text-accent">
                {initial.score}
              </span>
              <span className="text-xs text-fg-muted leading-snug">
                {initial.score_reason || "Se recalcula al guardar."}
              </span>
            </div>
            <div className="text-[10px] text-fg-subtle mt-2">
              El score se calcula automáticamente según los datos del contacto.
              Se actualiza al guardar cambios o registrar interacciones.
            </div>
          </div>
        )}
        {!initial && (
          <div className="p-3 rounded-lg bg-accent-soft border border-accent/30">
            <div className="text-xs text-accent leading-snug">
              El score se calcula automáticamente al guardar (0–100). Mientras
              más completa esté la info, mejor matchee el estilo y más
              interacciones registres, más alto el score.
            </div>
          </div>
        )}
      </GlassPanel>

      {/* Venue info — Sprint 20 (solo si type IN VENUE_TYPES) */}
      {isVenueType(form.type as ContactType) && (
        <GlassPanel className="space-y-4">
          <MonoLabel>Info del venue</MonoLabel>
          <p className="text-xs text-fg-muted -mt-2">
            Datos para que /descubrir pueda matchearte con otros DJs que
            buscan venues por capacidad o género.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad aprox (personas)</Label>
              <Input
                id="capacity"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Ej: 300"
                value={form.capacity_estimate ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  update(
                    "capacity_estimate",
                    v ? parseInt(v, 10) : null
                  );
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genres">Géneros que aceptan</Label>
              <Input
                id="genres"
                placeholder="techno, house, deep (separados por coma)"
                value={(form.accepted_genres ?? []).join(", ")}
                onChange={(e) => {
                  const list = e.target.value
                    .split(",")
                    .map((g) =>
                      g
                        .trim()
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, "")
                        .replace(/\s+/g, "-")
                    )
                    .filter((g) => g.length > 0);
                  update("accepted_genres", list);
                }}
              />
              {(form.accepted_genres ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(form.accepted_genres ?? []).map((g) => (
                    <span
                      key={g}
                      className="font-mono text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border border-border bg-cream"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Tags — Sprint 19 */}
      <GlassPanel className="space-y-3">
        <MonoLabel>Tags</MonoLabel>
        <p className="text-xs text-fg-muted -mt-1">
          Etiquetas libres para segmentar. Útil para filtrar en /crm y para
          campañas dirigidas. Lowercase, sin espacios (DROP las normaliza).
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(form.tags ?? []).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 border-2 border-border bg-cream font-mono text-[10px] font-bold lowercase px-2 py-0.5"
            >
              <span>#{t}</span>
              <button
                type="button"
                onClick={() => removeTag(t)}
                className="text-fg-muted hover:text-danger leading-none"
                aria-label={`Quitar tag ${t}`}
              >
                ×
              </button>
            </span>
          ))}
          {(form.tags ?? []).length === 0 && (
            <span className="text-xs text-fg-subtle">Sin tags todavía.</span>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                if (tagInput.trim()) addTag(tagInput);
              }
              if (e.key === "Backspace" && !tagInput && (form.tags ?? []).length > 0) {
                removeTag((form.tags as string[])[form.tags!.length - 1]);
              }
            }}
            placeholder="Ej: booker-stgo-centro (Enter para agregar)"
            className="flex-1"
          />
          <Button
            type="button"
            variant="clay"
            onClick={() => tagInput.trim() && addTag(tagInput)}
          >
            + Tag
          </Button>
        </div>
      </GlassPanel>

      {/* Notas */}
      <GlassPanel className="space-y-4">
        <MonoLabel>Notas</MonoLabel>
        <Textarea
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          placeholder="Cualquier contexto adicional sobre este contacto."
        />
      </GlassPanel>

      {/* Notas privadas — Sprint 19 */}
      <div className="hos-clay space-y-3 overflow-hidden rounded-2xl border border-orange/25 p-5">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-orange">
            <Lock className="h-3 w-3" />
            Notas privadas
          </span>
          <span className="rounded-full bg-orange px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
            solo tú
          </span>
        </div>
        <p className="text-xs text-fg-muted -mt-1">
          Nunca aparecen en press kit, export CSV ni plantillas de mail. Para
          cosas que NO quieres olvidar: cómo paga, qué le molesta, conexiones
          personales, etc.
        </p>
        <Textarea
          value={form.private_notes || ""}
          onChange={(e) => update("private_notes", e.target.value)}
          rows={5}
          placeholder="Ej: Paga el lunes siguiente, no efectivo. Pide rider técnico. Hijo de un amigo del Marco."
        />
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border border-border rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {message && (
            <div
              className={`text-sm ${
                message.type === "ok" ? "text-success" : "text-danger"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-auto">
          {initial && (
            <Button
              type="button"
              variant="clay"
              onClick={handleDelete}
              disabled={isPending || isDeleting}
              className="text-danger"
            >
              {isDeleting ? "Borrando…" : "Borrar"}
            </Button>
          )}
          <Button type="submit" variant="clayPrimary" disabled={isPending || isDeleting}>
            {isPending ? "Guardando…" : initial ? "Guardar cambios" : "Crear contacto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
