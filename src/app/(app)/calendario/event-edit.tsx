"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
import { GlassPanel, MonoLabel, Alert, FIELD, SELECT } from "@/components/hos";
import { Pencil, Trash2, X } from "lucide-react";
import {
  CALENDAR_EVENT_TYPES,
  CALENDAR_EVENT_TYPE_LABELS,
  type CalendarEventType,
} from "@/lib/calendar/types";
import { updateEventAction, deleteEventAction } from "./actions";

interface Props {
  eventId: string;
  current: {
    type: CalendarEventType;
    title: string;
    description: string;
    location: string;
    start_at: string; // ISO
    end_at: string;   // ISO
    all_day: boolean;
  };
}

/** Convierte ISO a formato datetime-local (YYYY-MM-DDTHH:mm) en zona local. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  // Ajuste por timezone offset para que el input muestre la hora local
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function EventEditDialog({ eventId, current }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<CalendarEventType>(current.type);
  const [title, setTitle] = useState(current.title);
  const [location, setLocation] = useState(current.location);
  const [description, setDescription] = useState(current.description);
  const [startAt, setStartAt] = useState(isoToLocalInput(current.start_at));
  const [endAt, setEndAt] = useState(isoToLocalInput(current.end_at));
  const [confirmDelete, setConfirmDelete] = useState(false);

  function close() {
    setOpen(false);
    setError(null);
    setConfirmDelete(false);
  }

  async function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteEventAction(eventId);
      if (result.ok) {
        close();
        router.refresh();
      } else {
        setError(result.error);
        setConfirmDelete(false);
      }
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Pon un título.");
      return;
    }
    if (!current.all_day && new Date(endAt) <= new Date(startAt)) {
      setError("La fecha de fin debe ser posterior a la de inicio.");
      return;
    }
    startTransition(async () => {
      const result = await updateEventAction(eventId, {
        type,
        title,
        description,
        location,
        // En all_day no mandamos fechas (el server las ignora igual, defensivo doble)
        startISO: current.all_day ? undefined : new Date(startAt).toISOString(),
        endISO: current.all_day ? undefined : new Date(endAt).toISOString(),
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(true);
        }}
        className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-fg-muted transition-colors hover:bg-white/10 hover:text-orange"
        title="Editar evento"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
        >
          <div
            className="w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassPanel padded={false} className="max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <MonoLabel>EDITAR EVENTO</MonoLabel>
                    <h2 className="font-display text-2xl leading-none mt-1 truncate">
                      {current.title}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="text-white/50 hover:text-white shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-type" className="text-xs">
                        Tipo
                      </Label>
                      <SelectNative
                        id="edit-type"
                        className={SELECT}
                        value={type}
                        onChange={(e) => setType(e.target.value as CalendarEventType)}
                      >
                        {CALENDAR_EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {CALENDAR_EVENT_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </SelectNative>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-location" className="text-xs">
                        Lugar
                      </Label>
                      <Input
                        id="edit-location"
                        className={FIELD}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Club, dirección…"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-title" className="text-xs">
                      Título *
                    </Label>
                    <Input
                      id="edit-title"
                      className={FIELD}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  {!current.all_day ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-start" className="text-xs">
                          Inicio
                        </Label>
                        <Input
                          id="edit-start"
                          className={FIELD}
                          type="datetime-local"
                          value={startAt}
                          onChange={(e) => setStartAt(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-end" className="text-xs">
                          Fin
                        </Label>
                        <Input
                          id="edit-end"
                          className={FIELD}
                          type="datetime-local"
                          value={endAt}
                          onChange={(e) => setEndAt(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/15 p-3">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                        📅 Evento de día completo. Para cambiar la fecha,
                        editalo en Google Calendar y sincroniza.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-description" className="text-xs">
                      Descripción
                    </Label>
                    <Textarea
                      id="edit-description"
                      className={FIELD}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Fee, condiciones, rider, etc."
                    />
                  </div>

                  {error && <Alert tone="danger">{error}</Alert>}

                  <div className="flex justify-between items-center gap-2 pt-3 border-t border-white/10">
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-danger transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
                        title="Borrar evento"
                      >
                        <Trash2 className="w-3 h-3" />
                        Borrar
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-danger">
                          ¿Borrar?
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(false)}
                          disabled={isPending}
                          className="rounded-full border border-white/12 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                        >
                          No
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isPending}
                          className="rounded-full border border-danger bg-danger px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
                        >
                          {isPending ? "Borrando…" : "Sí, borrar"}
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="clay" onClick={close}>
                        Cancelar
                      </Button>
                      <Button type="submit" variant="clayPrimary" disabled={isPending}>
                        {isPending ? "Guardando…" : "Guardar"}
                      </Button>
                    </div>
                  </div>

                  <p className="text-[10px] text-white/40 text-center pt-1">
                    Los cambios (y el borrado) se reflejan también en tu Google Calendar.
                  </p>
                </form>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </>
  );
}
