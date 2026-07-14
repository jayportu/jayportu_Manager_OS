"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SelectNative } from "@/components/ui/select-native";
import { GlassPanel, MonoLabel, Alert } from "@/components/hos";
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
  const confirm = useConfirm();
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
    const ta = document.getElementById("body") as HTMLTextAreaElement | null;
    const insert = `{${varKey}}`;
    // Posición actual del cursor; si no hay (textarea sin foco), al final.
    const cursor = ta?.selectionStart ?? body.length;
    setBody((b) => `${b.slice(0, cursor)}${insert}${b.slice(cursor)}`);
    // Reposicionar el cursor justo después de la variable insertada (post-render).
    setTimeout(() => {
      if (!ta) return;
      const pos = cursor + insert.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    }, 0);
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
    const { ok } = await confirm({
      title: "¿Borrar esta plantilla?",
      message: initial.name,
      variant: "danger",
      confirmLabel: "Borrar",
    });
    if (!ok) return;
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
      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>General</MonoLabel>
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
        </div>
      </GlassPanel>

      {channel === "email" && (
        <GlassPanel>
          <div className="space-y-4">
            <MonoLabel>Asunto (solo email)</MonoLabel>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Press kit · {my_name}"
            />
          </div>
        </GlassPanel>
      )}

      <GlassPanel>
        <div className="space-y-4">
          <MonoLabel>Mensaje</MonoLabel>
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
                  className="hos-clay rounded-full px-2.5 py-1 font-mono text-[11px] text-white/70 transition-transform hover:text-white active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange"
                  title={`${v.label} — ej: ${v.example}`}
                >
                  {`{${v.key}}`}
                </button>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>

      {error && <Alert tone="danger">{error}</Alert>}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        {initial && (
          <Button
            type="button"
            variant="clay"
            onClick={handleDelete}
            disabled={isPending}
            className="text-danger"
          >
            Borrar
          </Button>
        )}
        <Button
          type="submit"
          variant="clayPrimary"
          disabled={isPending}
          className="ml-auto"
        >
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
