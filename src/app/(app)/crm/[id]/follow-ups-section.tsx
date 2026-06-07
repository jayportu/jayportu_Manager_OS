"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { CalendarPlus, Check, Trash2, Clock, RotateCw, Pause } from "lucide-react";
import type {
  FollowUp,
  FollowUpPriority,
  RecurrenceUnit,
} from "@/types/database";
import {
  addFollowUpAction,
  completeFollowUpAction,
  deleteFollowUpAction,
  pauseRecurrenceAction,
} from "../actions";
import { useRouter } from "next/navigation";
import { dateTime } from "@/lib/format";

interface Props {
  contactId: string;
  followUps: FollowUp[];
}

export function FollowUpsSection({ contactId, followUps }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [priority, setPriority] = useState<FollowUpPriority>("normal");
  const [dueAt, setDueAt] = useState(() => {
    // default = mañana 10:00
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(10, 0, 0, 0);
    t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
    return t.toISOString().slice(0, 16);
  });

  // Sprint 19 — Recurrencia
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceValue, setRecurrenceValue] = useState("30");
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>("days");

  const pending = followUps.filter((f) => !f.done);
  const done = followUps.filter((f) => f.done);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const value = recurrenceValue ? parseInt(recurrenceValue, 10) : 0;
      const result = await addFollowUpAction({
        contact_id: contactId,
        due_at: new Date(dueAt).toISOString(),
        note,
        priority,
        is_recurring: isRecurring,
        recurrence_value: isRecurring && value > 0 ? value : null,
        recurrence_unit: isRecurring ? recurrenceUnit : null,
      });
      if (result.ok) {
        setOpen(false);
        setNote("");
        setIsRecurring(false);
        router.refresh();
      } else {
        alert(`No se pudo crear el follow-up: ${result.error}`);
      }
    });
  }

  async function handleComplete(id: string) {
    startTransition(async () => {
      await completeFollowUpAction(id, contactId);
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Borrar este follow-up?")) return;
    startTransition(async () => {
      await deleteFollowUpAction(id, contactId);
      router.refresh();
    });
  }

  async function handlePauseSeries(seriesId: string) {
    if (
      !confirm(
        "¿Pausar la recurrencia? El follow-up actual queda pendiente pero no se genera el siguiente al cerrarlo."
      )
    )
      return;
    startTransition(async () => {
      await pauseRecurrenceAction(seriesId, contactId);
      router.refresh();
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Próximos follow-ups{" "}
          {pending.length > 0 && (
            <span className="text-orange ml-1">({pending.length})</span>
          )}
        </h2>
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
          <CalendarPlus className="w-4 h-4" />
          {open ? "Cancelar" : "Agendar"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={handleAdd}
          className="mb-4 p-4 bg-cream border-2 border-ink space-y-3"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="due_at" className="text-xs">
                Cuándo
              </Label>
              <Input
                id="due_at"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority" className="text-xs">
                Prioridad
              </Label>
              <SelectNative
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
              >
                <option value="alta">Alta</option>
                <option value="normal">Normal</option>
                <option value="baja">Baja</option>
              </SelectNative>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note" className="text-xs">
              Qué hay que hacer
            </Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mandar press kit + tarifa"
              required
            />
          </div>

          {/* Sprint 19 — Toggle recurrente */}
          <div className="border-t-2 border-dashed border-ink pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="w-4 h-4 accent-orange"
              />
              <RotateCw className="w-4 h-4 text-orange" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                Hacer recurrente
              </span>
            </label>
            {isRecurring && (
              <div className="grid grid-cols-[80px_1fr] gap-2 mt-3 ml-6">
                <div className="space-y-1.5">
                  <Label htmlFor="rec-value" className="text-[10px]">
                    Cada
                  </Label>
                  <Input
                    id="rec-value"
                    type="number"
                    min={1}
                    value={recurrenceValue}
                    onChange={(e) => setRecurrenceValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="rec-unit" className="text-[10px]">
                    Unidad
                  </Label>
                  <SelectNative
                    id="rec-unit"
                    value={recurrenceUnit}
                    onChange={(e) =>
                      setRecurrenceUnit(e.target.value as RecurrenceUnit)
                    }
                  >
                    <option value="days">Días</option>
                    <option value="weeks">Semanas</option>
                    <option value="months">Meses</option>
                  </SelectNative>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="orange" disabled={isPending}>
              {isPending ? "Guardando…" : "Agendar"}
            </Button>
          </div>
        </form>
      )}

      {pending.length === 0 && !open && (
        <div className="text-sm text-fg-muted">
          No tienes follow-ups pendientes con este contacto.
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {pending.map((f) => {
          const priColor =
            f.priority === "alta"
              ? "text-danger"
              : f.priority === "baja"
              ? "text-fg-muted"
              : "text-warning";
          return (
            <li
              key={f.id}
              className="flex items-center gap-3 px-3 py-2 border-2 border-ink bg-white"
            >
              {f.is_recurring ? (
                <RotateCw className={`w-4 h-4 shrink-0 text-orange`} />
              ) : (
                <Clock className={`w-4 h-4 shrink-0 ${priColor}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-fg">
                  {f.note || "(sin nota)"}
                  {f.is_recurring && (
                    <span className="font-mono text-[9px] font-bold uppercase tracking-wider ml-2 px-1.5 py-0.5 bg-orange text-ink border border-ink">
                      cada {f.recurrence_value}
                      {f.recurrence_unit === "days"
                        ? "d"
                        : f.recurrence_unit === "weeks"
                        ? "sem"
                        : "m"}
                      {" · "}
                      ciclo {f.recurrence_index}
                    </span>
                  )}
                </div>
                <div className="text-xs text-fg-muted mt-0.5">
                  {dateTime(f.due_at)} · {f.priority}
                </div>
              </div>
              <button
                onClick={() => handleComplete(f.id)}
                disabled={isPending}
                className="p-1.5 hover:bg-success/10 text-success transition-colors"
                title={
                  f.is_recurring
                    ? "Marcar hecho — se crea el siguiente automático"
                    : "Marcar hecho"
                }
              >
                <Check className="w-4 h-4" />
              </button>
              {f.is_recurring && f.recurrence_series_id && (
                <button
                  onClick={() =>
                    handlePauseSeries(f.recurrence_series_id as string)
                  }
                  disabled={isPending}
                  className="p-1.5 hover:bg-warning/10 text-warning transition-colors"
                  title="Pausar recurrencia"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(f.id)}
                disabled={isPending}
                className="p-1.5 hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors"
                title="Borrar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-fg-muted cursor-pointer hover:text-fg">
            {done.length} {done.length === 1 ? "completado" : "completados"}
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {done.map((f) => (
              <li key={f.id} className="text-xs text-fg-subtle line-through pl-2">
                {dateTime(f.due_at)} — {f.note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
