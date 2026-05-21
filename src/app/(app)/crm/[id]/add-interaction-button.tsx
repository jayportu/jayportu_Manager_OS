"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { Plus, X } from "lucide-react";
import {
  INTERACTION_CHANNELS,
  INTERACTION_CHANNEL_LABELS,
  type InteractionChannel,
  type InteractionDirection,
} from "@/types/database";
import { addInteractionAction } from "../actions";
import { useRouter } from "next/navigation";

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
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Registrar
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="bg-bg-panel border border-border rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Registrar interacción</h2>
              <button
                type="button"
                onClick={close}
                className="text-fg-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="channel">Canal</Label>
                  <SelectNative
                    id="channel"
                    value={channel}
                    onChange={(e) =>
                      setChannel(e.target.value as InteractionChannel)
                    }
                  >
                    {INTERACTION_CHANNELS.map((c) => (
                      <option key={c} value={c}>
                        {INTERACTION_CHANNEL_LABELS[c]}
                      </option>
                    ))}
                  </SelectNative>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direction">Dirección</Label>
                  <SelectNative
                    id="direction"
                    value={direction}
                    onChange={(e) =>
                      setDirection(e.target.value as InteractionDirection)
                    }
                  >
                    <option value="out">Saliente (yo escribí)</option>
                    <option value="in">Entrante (me escribieron)</option>
                  </SelectNative>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="happened_at">Cuándo</Label>
                <Input
                  id="happened_at"
                  type="datetime-local"
                  value={happenedAt}
                  onChange={(e) => setHappenedAt(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Nota</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="Le mandé press kit y propuesta para 22 may. Quedó de revisarlo."
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
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
