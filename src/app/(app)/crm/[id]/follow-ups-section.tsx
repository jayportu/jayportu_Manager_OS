"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
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
import { GlassPanel, MonoLabel, EmptyState, Toggle, FIELD, SELECT } from "@/components/hos";
import { cn } from "@/lib/utils";

interface Props {
  contactId: string;
  followUps: FollowUp[];
}

export function FollowUpsSection({ contactId, followUps }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
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
        await confirm({
          title: "No se pudo crear el follow-up",
          message: result.error,
          confirmLabel: "Entendido",
          hideCancel: true,
          variant: "danger",
        });
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
    const { ok } = await confirm({
      title: "¿Borrar este follow-up?",
      variant: "danger",
      confirmLabel: "Borrar",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteFollowUpAction(id, contactId);
      router.refresh();
    });
  }

  async function handlePauseSeries(seriesId: string) {
    const { ok } = await confirm({
      title: "¿Pausar la recurrencia?",
      message:
        "El follow-up actual queda pendiente pero no se genera el siguiente al cerrarlo.",
      variant: "warning",
      confirmLabel: "Pausar",
    });
    if (!ok) return;
    startTransition(async () => {
      await pauseRecurrenceAction(seriesId, contactId);
      router.refresh();
    });
  }

  return (
    <GlassPanel className="mb-5">
      <div className="mb-4 flex items-center justify-between">
        <MonoLabel>
          Próximos follow-ups{pending.length > 0 ? ` (${pending.length})` : ""}
        </MonoLabel>
        <Button variant="clay" size="sm" onClick={() => setOpen(!open)}>
          <CalendarPlus className="h-3.5 w-3.5" />
          {open ? "Cancelar" : "Agendar"}
        </Button>
      </div>

      {open && (
        <form
          onSubmit={handleAdd}
          className="mb-4 space-y-3 rounded-xl border border-border bg-bg-subtle/40 p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                Cuándo
              </span>
              <input
                type="datetime-local"
                className={FIELD}
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
                Prioridad
              </span>
              <select
                className={SELECT}
                value={priority}
                onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
              >
                <option value="alta" className="bg-bg-panel">Alta</option>
                <option value="normal" className="bg-bg-panel">Normal</option>
                <option value="baja" className="bg-bg-panel">Baja</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted">
              Qué hay que hacer
            </span>
            <input
              className={FIELD}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mandar press kit + tarifa"
              required
            />
          </div>

          {/* Sprint 19 — Toggle recurrente */}
          <div className="border-t border-border pt-3">
            <Toggle
              checked={isRecurring}
              onChange={setIsRecurring}
              label="Hacer recurrente"
            />
            {isRecurring && (
              <div className="mt-3 grid grid-cols-[80px_1fr] gap-2">
                <div className="space-y-1.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted">
                    Cada
                  </span>
                  <input
                    type="number"
                    min={1}
                    className={FIELD}
                    value={recurrenceValue}
                    onChange={(e) => setRecurrenceValue(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-fg-muted">
                    Unidad
                  </span>
                  <select
                    className={SELECT}
                    value={recurrenceUnit}
                    onChange={(e) =>
                      setRecurrenceUnit(e.target.value as RecurrenceUnit)
                    }
                  >
                    <option value="days" className="bg-bg-panel">Días</option>
                    <option value="weeks" className="bg-bg-panel">Semanas</option>
                    <option value="months" className="bg-bg-panel">Meses</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="clayPrimary" size="sm" disabled={isPending}>
              {isPending ? "Guardando…" : "Agendar"}
            </Button>
          </div>
        </form>
      )}

      {pending.length === 0 && !open && (
        <EmptyState
          icon={CalendarPlus}
          title="Sin follow-ups pendientes"
          sub="Agenda el próximo contacto con este lead."
        />
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
              className="flex items-center gap-3 rounded-xl border border-border bg-bg-subtle/40 px-3 py-2.5"
            >
              {f.is_recurring ? (
                <RotateCw className="h-4 w-4 shrink-0 text-orange" />
              ) : (
                <Clock className={cn("h-4 w-4 shrink-0", priColor)} />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-fg">
                  {f.note || "(sin nota)"}
                  {f.is_recurring && (
                    <span className="ml-2 rounded-full bg-orange px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-ink">
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
                <div className="mt-0.5 text-xs text-fg-muted">
                  {dateTime(f.due_at)} · {f.priority}
                </div>
              </div>
              <button
                onClick={() => handleComplete(f.id)}
                disabled={isPending}
                className="rounded-full p-1.5 text-success transition-colors hover:bg-success/10"
                title={
                  f.is_recurring
                    ? "Marcar hecho — se crea el siguiente automático"
                    : "Marcar hecho"
                }
              >
                <Check className="h-4 w-4" />
              </button>
              {f.is_recurring && f.recurrence_series_id && (
                <button
                  onClick={() =>
                    handlePauseSeries(f.recurrence_series_id as string)
                  }
                  disabled={isPending}
                  className="rounded-full p-1.5 text-warning transition-colors hover:bg-warning/10"
                  title="Pausar recurrencia"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => handleDelete(f.id)}
                disabled={isPending}
                className="rounded-full p-1.5 text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger"
                title="Borrar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      {done.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-fg-muted hover:text-fg">
            {done.length} {done.length === 1 ? "completado" : "completados"}
          </summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {done.map((f) => (
              <li key={f.id} className="pl-2 text-xs text-fg-subtle line-through">
                {dateTime(f.due_at)} — {f.note}
              </li>
            ))}
          </ul>
        </details>
      )}
    </GlassPanel>
  );
}
