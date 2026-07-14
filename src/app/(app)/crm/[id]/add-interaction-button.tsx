"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import {
  INTERACTION_CHANNELS,
  INTERACTION_CHANNEL_LABELS,
  type InteractionChannel,
  type InteractionDirection,
} from "@/types/database";
import { addInteractionAction } from "../actions";
import { useRouter } from "next/navigation";
import { Alert, FIELD, SELECT } from "@/components/hos";
import { cn } from "@/lib/utils";

interface Props {
  contactId: string;
}

export function AddInteractionButton({ contactId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<InteractionChannel>("whatsapp");
  const [direction, setDirection] = useState<InteractionDirection>("out");
  const [note, setNote] = useState("");
  // datetime-local needs local date string; default = now
  const [happenedAt, setHappenedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setError(null);
    setNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const happenedAtIso = new Date(happenedAt).toISOString();
      const result = await addInteractionAction({
        contact_id: contactId,
        channel,
        direction,
        note,
        happened_at: happenedAtIso,
      });
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button variant="clayPrimary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Registrar
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-bg-panel p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl leading-none text-fg">
                Registrar interacción<span className="text-orange">.</span>
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-fg-muted hover:text-fg"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex gap-2">
                <select
                  aria-label="Canal"
                  className={SELECT}
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as InteractionChannel)
                  }
                >
                  {INTERACTION_CHANNELS.map((c) => (
                    <option key={c} value={c} className="bg-bg-panel">
                      {INTERACTION_CHANNEL_LABELS[c]}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Dirección"
                  className={SELECT}
                  value={direction}
                  onChange={(e) =>
                    setDirection(e.target.value as InteractionDirection)
                  }
                >
                  <option value="out" className="bg-bg-panel">
                    Saliente (yo escribí)
                  </option>
                  <option value="in" className="bg-bg-panel">
                    Entrante (me escribieron)
                  </option>
                </select>
              </div>

              <input
                aria-label="Cuándo"
                type="datetime-local"
                className={FIELD}
                value={happenedAt}
                onChange={(e) => setHappenedAt(e.target.value)}
                required
              />

              <textarea
                aria-label="Nota"
                rows={4}
                placeholder="Le mandé press kit y propuesta para 22 may. Quedó de revisarlo."
                className={cn(FIELD, "resize-none")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
              />

              {error && <Alert tone="danger">{error}</Alert>}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="clay" size="sm" onClick={close}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="clayPrimary"
                  size="sm"
                  disabled={isPending}
                >
                  {isPending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
