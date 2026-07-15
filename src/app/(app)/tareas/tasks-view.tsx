"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Pencil,
  X,
  LayoutGrid,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AtSign,
  CheckSquare,
} from "lucide-react";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskContactOption,
} from "@/lib/queries/tasks";
import {
  createTaskAction,
  updateTaskAction,
  setTaskStatusAction,
  deleteTaskAction,
  type TaskFormValues,
} from "./actions";
import {
  GlassPanel,
  MonoLabel,
  Badge,
  Alert,
  EmptyState,
  ClayChipButton,
  FIELD,
  SELECT,
} from "@/components/hos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ActionResult = { ok: true } | { ok: false; error: string };

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "por_hacer", label: "Por hacer" },
  { id: "en_progreso", label: "En progreso" },
  { id: "hecho", label: "Hecho" },
];

const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "alta", label: "Alta" },
  { id: "normal", label: "Normal" },
  { id: "baja", label: "Baja" },
];

function isOverdue(due: string | null): boolean {
  if (!due) return false;
  return new Date(due).getTime() < Date.now();
}
function fmtDate(due: string | null): string {
  if (!due) return "";
  return new Date(due).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
  });
}
function toDateInput(due: string | null): string {
  return due ? due.slice(0, 10) : "";
}

/** Chips de prioridad / fecha / contacto, compartidos por lista y Kanban. */
function TaskChips({ task }: { task: Task }) {
  const over = isOverdue(task.due_at) && task.status !== "hecho";
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <Badge
        tone={
          task.priority === "alta"
            ? "down"
            : task.priority === "baja"
              ? "neutral"
              : "info"
        }
        solid={task.priority === "alta"}
      >
        {task.priority}
      </Badge>
      {task.due_at && (
        <span
          className={cn(
            "inline-flex items-center gap-1 font-mono text-[10px]",
            over ? "font-bold text-[rgb(var(--drop-danger))]" : "text-white/45"
          )}
        >
          <CalendarDays width={11} height={11} aria-hidden /> {fmtDate(task.due_at)}
          {over ? " · vencida" : ""}
        </span>
      )}
      {task.contact_name && (
        <span className="inline-flex items-center gap-1 rounded-full border border-white/12 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[rgb(var(--drop-orange))]">
          <AtSign width={10} height={10} aria-hidden /> {task.contact_name}
        </span>
      )}
    </div>
  );
}

export function TasksView({
  initialTasks,
  contacts,
}: {
  initialTasks: Task[];
  contacts: TaskContactOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [editing, setEditing] = useState<Task | null>(null);

  // Alta rápida
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [due, setDue] = useState("");
  const [contactId, setContactId] = useState("");

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setErr(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) {
        setErr(r.error);
        return;
      }
      after?.();
      router.refresh();
    });
  }

  function addTask() {
    // Sin la guarda de `pending`, un segundo Enter en el input (que NO está en
    // un <form>, así que no hereda el disabled del botón) mientras el server
    // action está en vuelo creaba una tarea duplicada — el título solo se
    // limpia en el callback de éxito.
    if (pending || !title.trim()) return;
    run(
      () =>
        createTaskAction({
          title,
          notes: "",
          priority,
          due_at: due,
          contact_id: contactId,
        }),
      () => {
        setTitle("");
        setPriority("normal");
        setDue("");
        setContactId("");
      }
    );
  }

  function toggleDone(t: Task) {
    run(() =>
      setTaskStatusAction(t.id, t.status === "hecho" ? "por_hacer" : "hecho")
    );
  }
  function moveStatus(t: Task, dir: -1 | 1) {
    const i = COLUMNS.findIndex((c) => c.id === t.status);
    const j = i + dir;
    if (j < 0 || j >= COLUMNS.length) return;
    run(() => setTaskStatusAction(t.id, COLUMNS[j].id));
  }
  function removeTask(t: Task) {
    run(() => deleteTaskAction(t.id));
  }

  const listOrder = [...initialTasks].sort((a, b) => {
    const ad = a.status === "hecho" ? 1 : 0;
    const bd = b.status === "hecho" ? 1 : 0;
    if (ad !== bd) return ad - bd;
    return (a.due_at ?? "9999").localeCompare(b.due_at ?? "9999");
  });

  return (
    <div>
      {/* Toggle de vista */}
      <div className="mb-4 flex items-center gap-2">
        <ClayChipButton
          icon={ListIcon}
          active={view === "list"}
          onClick={() => setView("list")}
        >
          Lista
        </ClayChipButton>
        <ClayChipButton
          icon={LayoutGrid}
          active={view === "kanban"}
          onClick={() => setView("kanban")}
        >
          Kanban
        </ClayChipButton>
      </div>

      {/* Alta rápida — superficie sólida */}
      <div
        className="mb-5 flex flex-col gap-2 rounded-2xl border border-white/10 p-3 sm:flex-row sm:items-end"
        style={{ background: "rgba(255,255,255,.03)" }}
      >
        <div className="flex-1">
          <label
            htmlFor="new-task-title"
            className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
          >
            Nueva tarea
          </label>
          <input
            id="new-task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
            placeholder="Ej. Enviar rider a Club X"
            className={FIELD}
          />
        </div>
        <select
          aria-label="Prioridad"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className={cn(SELECT, "sm:w-28")}
        >
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id} className="bg-bg-panel">
              {p.label}
            </option>
          ))}
        </select>
        <input
          aria-label="Fecha límite"
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className={cn(FIELD, "sm:w-40")}
        />
        <select
          aria-label="Contacto"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className={cn(SELECT, "sm:w-44")}
        >
          <option value="" className="bg-bg-panel">
            Sin contacto
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id} className="bg-bg-panel">
              {c.name}
            </option>
          ))}
        </select>
        <Button variant="clayPrimary" disabled={pending} onClick={addTask}>
          <Plus /> Agregar
        </Button>
      </div>

      {err && (
        <div className="mb-4">
          <Alert tone="danger">{err}</Alert>
        </div>
      )}

      {initialTasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Sin tareas aún"
          sub="Crea la primera arriba: un pendiente, con prioridad, fecha y contacto."
        />
      ) : view === "list" ? (
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between">
            <MonoLabel>Pendientes</MonoLabel>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              {initialTasks.filter((t) => t.status !== "hecho").length} abiertas ·{" "}
              {initialTasks.length} total
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {listOrder.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-white/10 p-3 transition-opacity",
                  t.status === "hecho" && "opacity-50"
                )}
                style={{ background: "rgba(255,255,255,.03)" }}
              >
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleDone(t)}
                  aria-label="Completar"
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:rgb(var(--drop-orange))] disabled:opacity-50"
                  style={
                    t.status === "hecho"
                      ? {
                          background: "rgb(var(--drop-orange))",
                          borderColor: "rgb(var(--drop-orange))",
                          color: "#0B0B0B",
                        }
                      : { borderColor: "rgba(255,255,255,.25)" }
                  }
                >
                  {t.status === "hecho" ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate text-sm font-semibold",
                      t.status === "hecho" && "line-through"
                    )}
                  >
                    {t.title}
                  </div>
                  <TaskChips task={t} />
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setEditing(t)}
                  className="shrink-0 text-white/40 hover:text-[rgb(var(--drop-orange))]"
                  title="Editar"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeTask(t)}
                  className="shrink-0 text-white/40 hover:text-[rgb(var(--drop-danger))]"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {COLUMNS.map((col, ci) => {
            const items = initialTasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-white/10"
                style={{ background: "rgba(255,255,255,.02)" }}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                    {col.label}
                  </span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] text-white/60">
                    {items.length}
                  </span>
                </div>
                <div className="flex min-h-[90px] flex-1 flex-col gap-2 p-2.5">
                  {items.length === 0 && (
                    <div className="p-2 font-mono text-[10px] uppercase tracking-wider text-white/25">
                      — vacío —
                    </div>
                  )}
                  {items.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-white/10 p-2.5"
                      style={{ background: "rgba(255,255,255,.04)" }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] font-semibold leading-tight">
                          {t.title}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setEditing(t)}
                            className="text-white/40 hover:text-[rgb(var(--drop-orange))]"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => removeTask(t)}
                            className="text-white/40 hover:text-[rgb(var(--drop-danger))]"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <TaskChips task={t} />
                      <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                        <button
                          type="button"
                          disabled={pending || ci === 0}
                          onClick={() => moveStatus(t, -1)}
                          className="text-white/40 hover:text-white disabled:opacity-25"
                          title="Mover a la izquierda"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending || ci === COLUMNS.length - 1}
                          onClick={() => moveStatus(t, 1)}
                          className="text-white/40 hover:text-white disabled:opacity-25"
                          title="Mover a la derecha"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditTaskModal
          task={editing}
          contacts={contacts}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(values) =>
            run(() => updateTaskAction(editing.id, values), () => setEditing(null))
          }
        />
      )}
    </div>
  );
}

function EditTaskModal({
  task,
  contacts,
  pending,
  onClose,
  onSave,
}: {
  task: Task;
  contacts: TaskContactOption[];
  pending: boolean;
  onClose: () => void;
  onSave: (values: TaskFormValues) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [due, setDue] = useState(toDateInput(task.due_at));
  const [contactId, setContactId] = useState(task.contact_id ?? "");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/12 p-5"
        style={{
          background: "rgba(22,22,22,0.96)",
          boxShadow: "0 24px 60px rgba(0,0,0,.6)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl leading-none">
            Editar tarea
            <span style={{ color: "rgb(var(--drop-orange))" }}>.</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/50 hover:text-white"
            aria-label="Cerrar"
          >
            <X width={20} height={20} />
          </button>
        </div>

        <label
          htmlFor="edit-task-title"
          className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
        >
          Título
        </label>
        <input
          id="edit-task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(FIELD, "mb-3")}
        />

        <label
          htmlFor="edit-task-notes"
          className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
        >
          Notas
        </label>
        <textarea
          id="edit-task-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={cn(FIELD, "mb-3")}
        />

        <div className="mb-3 flex gap-2">
          <div className="flex-1">
            <label
              htmlFor="edit-task-priority"
              className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
            >
              Prioridad
            </label>
            <select
              id="edit-task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={SELECT}
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id} className="bg-bg-panel">
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label
              htmlFor="edit-task-due"
              className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
            >
              Fecha límite
            </label>
            <input
              id="edit-task-due"
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={FIELD}
            />
          </div>
        </div>

        <label
          htmlFor="edit-task-contact"
          className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-white/40"
        >
          Contacto
        </label>
        <select
          id="edit-task-contact"
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className={cn(SELECT, "mb-4")}
        >
          <option value="" className="bg-bg-panel">
            Sin contacto
          </option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id} className="bg-bg-panel">
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <ClayChipButton onClick={onClose}>Cancelar</ClayChipButton>
          <Button
            variant="clayPrimary"
            disabled={pending || !title.trim()}
            onClick={() =>
              onSave({
                title,
                notes,
                priority,
                due_at: due,
                contact_id: contactId,
              })
            }
          >
            Guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
