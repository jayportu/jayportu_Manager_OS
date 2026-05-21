"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import {
  CONTACT_TYPES,
  CONTACT_STATUS,
  MAIN_CHANNELS,
  CONTACT_TYPE_LABELS,
  CONTACT_STATUS_LABELS,
  MAIN_CHANNEL_LABELS,
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
  score: 50,
  score_reason: "",
  notes: "",
};

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
          score: initial.score,
          score_reason: initial.score_reason,
          notes: initial.notes,
        }
      : EMPTY
  );
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identidad */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Identidad
        </h2>
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
      </Card>

      {/* Persona de contacto */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Persona de contacto
        </h2>
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
      </Card>

      {/* Canales */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Canales de contacto
        </h2>
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
      </Card>

      {/* Pipeline */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Pipeline
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
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
          <div className="space-y-2">
            <Label htmlFor="score">Score (0–100)</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              value={form.score ?? 50}
              onChange={(e) => update("score", parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="score_reason">¿Por qué este score?</Label>
          <Input
            id="score_reason"
            value={form.score_reason || ""}
            onChange={(e) => update("score_reason", e.target.value)}
            placeholder="Tiene noches Tech House recurrentes + booker visible"
          />
        </div>
      </Card>

      {/* Notas */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Notas
        </h2>
        <Textarea
          value={form.notes || ""}
          onChange={(e) => update("notes", e.target.value)}
          rows={4}
          placeholder="Cualquier contexto adicional sobre este contacto."
        />
      </Card>

      {/* Submit */}
      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border border-border rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
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
              variant="outline"
              onClick={handleDelete}
              disabled={isPending || isDeleting}
              className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
            >
              {isDeleting ? "Borrando…" : "Borrar"}
            </Button>
          )}
          <Button type="submit" disabled={isPending || isDeleting}>
            {isPending ? "Guardando…" : initial ? "Guardar cambios" : "Crear contacto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
