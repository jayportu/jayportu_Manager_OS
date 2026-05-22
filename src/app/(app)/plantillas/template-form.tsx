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
  TEMPLATE_CATEGORIES,
  TEMPLATE_CHANNELS,
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_CHANNEL_LABELS,
  type Template,
  type TemplateCategory,
  type TemplateChannel,
} from "@/types/database";
import {
  AVAILABLE_VARIABLES,
} from "@/lib/templates/variables";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "./actions";

interface Props {
  initial?: Template;
}

export function TemplateForm({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState<TemplateCategory>(
    initial?.category || "primer_contacto"
  );
  const [channel, setChannel] = useState<TemplateChannel>(
    initial?.channel_suggested || "whatsapp"
  );
  const [subject, setSubject] = useState(initial?.subject || "");
  const [body, setBody] = useState(initial?.body || "");
  const [error, setError] = useState<string | null>(null);

  function insertVariable(varKey: string) {
    const cursor = (
      document.getElementById("body") as HTMLTextAreaElement | null
    )?.selectionStart;
    if (cursor === null || cursor === undefined) {
      setBody((b) => `${b}{${varKey}}`);
      return;
    }
    setBody((b) => `${b.slice(0, cursor)}{${varKey}}${b.slice(cursor)}`);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!body.trim()) {
      setError("El cuerpo del mensaje es obligatorio.");
      return;
    }
    startTransition(async () => {
      if (initial) {
        const result = await updateTemplateAction(initial.id, {
          name,
          category,
          channel_suggested: channel,
          subject,
          body,
        });
        if (result.ok) {
          router.push("/plantillas");
          router.refresh();
        } else {
          setError(result.error);
        }
      } else {
        const result = await createTemplateAction({
          name,
          category,
          channel_suggested: channel,
          subject,
          body,
        });
        if (result.ok) {
          router.push("/plantillas");
          router.refresh();
        } else {
          setError(result.error);
        }
      }
    });
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`¿Borrar la plantilla "${initial.name}"?`)) return;
    startTransition(async () => {
      const result = await deleteTemplateAction(initial.id);
      if (result.ok) {
        router.push("/plantillas");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          General
        </h2>
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Primer contacto · Venue"
            required
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <SelectNative
              id="category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as TemplateCategory)
              }
            >
              {TEMPLATE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {TEMPLATE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </SelectNative>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel">Canal sugerido</Label>
            <SelectNative
              id="channel"
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as TemplateChannel)
              }
            >
              {TEMPLATE_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {TEMPLATE_CHANNEL_LABELS[c]}
                </option>
              ))}
            </SelectNative>
          </div>
        </div>
      </Card>

      {channel === "email" && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Asunto (solo email)
          </h2>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Press kit · {my_name}"
          />
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Mensaje
        </h2>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          className="font-mono text-sm"
          placeholder="Hola {contact_person}, soy {my_name}..."
          required
        />
        <div>
          <Label className="text-xs">Variables disponibles (click para insertar)</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {AVAILABLE_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                className="text-[11px] px-2 py-1 rounded border border-border bg-bg hover:border-accent hover:text-accent transition-colors font-mono"
                title={`${v.label} — ej: ${v.example}`}
              >
                {`{${v.key}}`}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {initial && (
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isPending}
            className="text-danger border-danger/30 hover:bg-danger/10 hover:text-danger"
          >
            Borrar
          </Button>
        )}
        <Button type="submit" disabled={isPending} className="ml-auto">
          {isPending
            ? "Guardando…"
            : initial
            ? "Guardar cambios"
            : "Crear plantilla"}
        </Button>
      </div>
    </form>
  );
}
