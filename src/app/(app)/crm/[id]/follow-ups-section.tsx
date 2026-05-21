"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { SelectNative } from "@/components/ui/select-native";
import { CalendarPlus, Check, Trash2, Clock } from "lucide-react";
import type { FollowUp, FollowUpPriority } from "@/types/database";
import {
  addFollowUpAction,
  completeFollowUpAction,
  deleteFollowUpAction,
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

  const pending = followUps.filter((f) => !f.done);
  const done = followUps.filter((f) => f.done);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addFollowUpAction({
        contact_id: contactId,
        due_at: new Date(dueAt).toISOString(),
        note,
        priority,
      });
      if (result.ok) {
        setOpen(false);
        setNote("");
        router.refresh();
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

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Próximos follow-ups{" "}
          {pending.length > 0 && (
            <span className="text-accent ml-1">({pending.length})</span>
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
          className="mb-4 p-4 bg-bg rounded-lg border border-border space-y-3"
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
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending}>
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg border border-border"
            >
              <Clock className={`w-4 h-4 shrink-0 ${priColor}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-fg">{f.note || "(sin nota)"}</div>
                <div className="text-xs text-fg-muted mt-0.5">
                  {dateTime(f.due_at)} · {f.priority}
                </div>
              </div>
              <button
                onClick={() => handleComplete(f.id)}
                disabled={isPending}
                className="p-1.5 rounded hover:bg-success/10 text-success transition-colors"
                title="Marcar hecho"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(f.id)}
                disabled={isPending}
                className="p-1.5 rounded hover:bg-danger/10 text-fg-muted hover:text-danger transition-colors"
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
