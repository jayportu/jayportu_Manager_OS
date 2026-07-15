"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DjProfile } from "@/types/database";
import { Button } from "@/components/ui/button";
import { GlassPanel, MonoLabel, Alert, Toggle, FIELD } from "@/components/hos";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Bell } from "lucide-react";
import { updateAvailabilityAction } from "./availability-actions";

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
    <GlassPanel>
      <div className="space-y-5">
        <div>
          <MonoLabel>Marketplace · /dj</MonoLabel>
          <h2 className="mt-2 font-display text-3xl leading-none">
            Disponibilidad<span className="text-orange">.</span>
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/55">
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
        <div className="flex items-start gap-3 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3.5">
          <div className="shrink-0 pt-0.5">
            {hiddenFromDirectory ? (
              <EyeOff className="h-5 w-5 text-white/40" />
            ) : (
              <Eye className="h-5 w-5 text-orange" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Toggle
              checked={!hiddenFromDirectory}
              onChange={(v) => setHiddenFromDirectory(!v)}
              label={
                hiddenFromDirectory
                  ? "Perfil oculto del directorio"
                  : "Perfil visible en /dj"
              }
              sub={
                hiddenFromDirectory
                  ? "Tu perfil no aparece en dropgigs.com/dj. Solo accesible por link directo a tu press kit."
                  : "Aparece en el directorio público, los bookers pueden encontrarte."
              }
            />
          </div>
        </div>

        {/* Bloque disponibilidad */}
        <div
          className={cn(
            "rounded-xl border p-4",
            isAvailableNow
              ? "border-orange/40 bg-orange/10"
              : "border-white/12 bg-white/[0.04]"
          )}
        >
          <div className="mb-3 flex items-center gap-3">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                background: isAvailableNow
                  ? "rgb(var(--drop-orange))"
                  : "rgba(255,255,255,0.25)",
              }}
              aria-hidden
            />
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-white/80">
              {isAvailableNow
                ? "★ Disponible AHORA · tu perfil aparece primero"
                : hasAvailability
                ? "Disponibilidad agendada (futura)"
                : "Sin disponibilidad marcada"}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label
                htmlFor="avail-from"
                className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/40"
              >
                Disponible desde
              </label>
              <input
                id="avail-from"
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className={FIELD}
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="avail-until"
                className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/40"
              >
                Hasta (opcional)
              </label>
              <input
                id="avail-until"
                type="date"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className={FIELD}
                style={{ colorScheme: "dark" }}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <label
              htmlFor="avail-note"
              className="block font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/40"
            >
              Nota para bookers (opcional)
            </label>
            <textarea
              id="avail-note"
              value={availableNote}
              onChange={(e) => setAvailableNote(e.target.value)}
              rows={2}
              placeholder="Ej: Busco shows en Santiago viernes-domingo. EP launches y residencias."
              maxLength={280}
              className={cn(FIELD, "resize-none")}
            />
            <div className="text-right font-mono text-[10px] text-white/35">
              {availableNote.length}/280
            </div>
          </div>
          {hasAvailability && (
            <button
              type="button"
              onClick={clearAvailability}
              className="mt-3 font-mono text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-danger"
            >
              Vaciar campos (recuerda guardar)
            </button>
          )}
        </div>

        {message && (
          <Alert tone={message.type === "ok" ? "success" : "danger"}>
            {message.text}
          </Alert>
        )}

        <p className="flex items-start gap-1.5 text-[11px] text-white/45">
          <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" />
          Cuando publicas tu disponibilidad, los bookers que te siguen con avisos
          activados reciben un email. Mientras más completo tu perfil, más
          seguidores.
        </p>

        <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
          <Button onClick={handleSave} disabled={isPending} variant="clayPrimary">
            {isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}
