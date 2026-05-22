"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateSlugAction } from "./actions";
import { useRouter } from "next/navigation";

export function SlugEditor({
  currentSlug,
  baseUrl,
}: {
  currentSlug: string;
  baseUrl: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [slug, setSlug] = useState(currentSlug);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-xs">Slug actual</Label>
          <div className="text-sm font-mono text-fg-muted mt-1">
            /p/<span className="text-fg">{currentSlug}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditing(true);
            setSlug(currentSlug);
            setError(null);
          }}
        >
          Cambiar
        </Button>
      </div>
    );
  }

  async function handleSave() {
    setError(null);
    const clean = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!clean) {
      setError("El slug no puede estar vacío.");
      return;
    }
    startTransition(async () => {
      const result = await updateSlugAction(clean);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="slug" className="text-xs">
        Nuevo slug
      </Label>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-fg-muted font-mono shrink-0">
          {baseUrl}/p/
        </span>
        <Input
          id="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="font-mono flex-1 min-w-[150px]"
          placeholder="tu-slug"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} size="sm" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
          disabled={isPending}
        >
          Cancelar
        </Button>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      <p className="text-[10px] text-fg-subtle">
        Solo letras, números y guiones. Cuidado: si cambias el slug, los links
        viejos dejan de funcionar.
      </p>
    </div>
  );
}
