"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DjProfile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { updateAvailabilityAction } from "./actions";

interface Props {
  profile: DjProfile;
}

export function AvailabilitySection({ profile }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hiddenFromDirectory, setHiddenFromDirectory] = useState(
    profile.hidden_from_directory
  );
  const [availableFrom, setAvailableFrom] = useState(
    profile.available_from ?? ""
  );
  const [availableUntil, setAvailableUntil] = useState(
    profile.available_until ?? ""
  );
  const [availableNote, setAvailableNote] = useState(
    profile.available_note ?? ""
  );
  const [message, setMessage] = useState<
    { type: "ok" | "err"; text: string } | null
  >(null);

  const hasAvailability = !!availableFrom;
  const today = new Date().toISOString().slice(0, 10);
  const isAvailableNow =
    hasAvailability &&
    today >= availableFrom &&
    (!availableUntil || today <= availableUntil);

  async function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateAvailabilityAction({
        hidden_from_directory: hiddenFromDirectory,
        available_from: availableFrom || null,
        available_until: availableUntil || null,
        available_note: availableNote,
      });
      if (result.ok) {
        setMessage({ type: "ok", text: "Guardado." });
        router.refresh();
      } else {
        setMessage({ type: "err", text: result.error });
      }
    });
  }

  function clearAvailability() {
    setAvailableFrom("");
    setAvailableUntil("");
    setAvailableNote("");
  }

  return (
    <Card className="p-6 space-y-5">
      <div>
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
          — MARKETPLACE · /dj
        </div>
        <h2 className="font-display text-3xl leading-none mt-2">
          Disponibilidad<span className="text-orange">.</span>
        </h2>
        <p className="text-sm text-fg-muted mt-2 max-w-xl">
          Tu perfil aparece automáticamente en el directorio público{" "}
          <a
            href="/dj"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:underline"
          >
            dropgigs.com/dj
          </a>
          . Bookers y venues lo pueden ver. Activa &ldquo;disponible para
          tocar&rdquo; cuando estés tomando shows.
        </p>
      </div>

      {/* Toggle visibilidad en directorio */}
      <div className="border-2 border-ink p-4 flex items-start gap-3">
        <div className="shrink-0">
          {hiddenFromDirectory ? (
            <EyeOff className="w-5 h-5 text-fg-muted" />
          ) : (
            <Eye className="w-5 h-5 text-orange" />
          )}
        </div>
        <div className="flex-1">
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider">
            {hiddenFromDirectory ? "Perfil OCULTO del directorio" : "Perfil visible en /dj"}
          </div>
          <p className="text-xs text-fg-muted mt-1">
            {hiddenFromDirectory
              ? "Tu perfil no aparece en dropgigs.com/dj. Solo accesible por link directo a tu press kit."
              : "Aparece en el directorio público, los bookers pueden encontrarte."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setHiddenFromDirectory(!hiddenFromDirectory)}
          className={`shrink-0 w-14 h-7 border-2 border-ink relative transition-colors ${
            hiddenFromDirectory ? "bg-cream" : "bg-orange"
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 bg-ink transition-all ${
              hiddenFromDirectory ? "left-0.5" : "left-7"
            }`}
          />
        </button>
      </div>

      {/* Bloque disponibilidad */}
      <div
        className={`border-2 border-ink p-4 ${
          isAvailableNow ? "bg-orange/10" : "bg-cream"
        }`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-3 h-3 border-2 border-ink ${
              isAvailableNow ? "bg-orange" : "bg-cream"
            }`}
          />
          <div className="font-mono text-[11px] font-bold uppercase tracking-wider">
            {isAvailableNow
              ? "★ Disponible AHORA · tu perfil aparece primero"
              : hasAvailability
              ? "Disponibilidad agendada (futura)"
              : "Sin disponibilidad marcada"}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="avail-from">Disponible desde</Label>
            <Input
              id="avail-from"
              type="date"
              value={availableFrom}
              onChange={(e) => setAvailableFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="avail-until">Hasta (opcional)</Label>
            <Input
              id="avail-until"
              type="date"
              value={availableUntil}
              onChange={(e) => setAvailableUntil(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5 mt-3">
          <Label htmlFor="avail-note">Nota para bookers (opcional)</Label>
          <Textarea
            id="avail-note"
            value={availableNote}
            onChange={(e) => setAvailableNote(e.target.value)}
            rows={2}
            placeholder="Ej: Busco shows en Santiago viernes-domingo. EP launches y residencias."
            maxLength={280}
          />
          <div className="text-[10px] text-fg-subtle">
            {availableNote.length}/280
          </div>
        </div>
        {hasAvailability && (
          <button
            type="button"
            onClick={clearAvailability}
            className="mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted hover:text-danger"
          >
            Limpiar disponibilidad
          </button>
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

      <div className="flex justify-end gap-2 pt-2 border-t-2 border-ink">
        <Button onClick={handleSave} disabled={isPending} variant="orange">
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </Card>
  );
}
