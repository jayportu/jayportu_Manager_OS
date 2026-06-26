"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SelectNative } from "@/components/ui/select-native";
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
        className="p-1.5 border-2 border-border bg-cream hover:bg-ink hover:text-orange transition-colors"
        title="Editar evento"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={close}
        >
          <Card
            className="bg-bg-panel w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
                  — EDITAR EVENTO
                </div>
                <h2 className="font-display text-2xl leading-none mt-1 truncate">
                  {current.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-fg-muted hover:text-fg shrink-0"
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
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-border p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-fg-muted">
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
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Fee, condiciones, rider, etc."
                />
              </div>

              {error && (
                <div className="text-sm text-danger bg-danger/10 border-2 border-danger px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-between items-center gap-2 pt-3 border-t-2 border-border">
                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-danger hover:text-white dark:hover:text-ink hover:bg-danger px-2 py-1.5 border-2 border-danger transition-colors disabled:opacity-50"
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
                      className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 border-2 border-border bg-cream hover:bg-ink hover:text-orange transition-colors disabled:opacity-50"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isPending}
                      className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 border-2 border-danger bg-danger text-white dark:text-ink hover:bg-ink hover:border-border transition-colors disabled:opacity-50"
                    >
                      {isPending ? "Borrando…" : "Sí, borrar"}
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={close}>
                    Cancelar
                  </Button>
                  <Button type="submit" variant="orange" disabled={isPending}>
                    {isPending ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </div>

              <p className="text-[10px] text-fg-subtle text-center pt-1">
                Los cambios (y el borrado) se reflejan también en tu Google Calendar.
              </p>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
