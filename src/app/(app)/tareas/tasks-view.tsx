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
    <div className="flex flex-wrap items-center gap-1.5 mt-1">
      <span
        className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${
          task.priority === "alta"
            ? "bg-accent text-white border-accent"
            : "text-fg-muted border-border"
        } ${task.priority === "baja" ? "opacity-60" : ""}`}
      >
        {task.priority}
      </span>
      {task.due_at && (
        <span
          className={`text-[10px] font-mono ${
            over ? "text-danger font-bold" : "text-fg-muted"
          }`}
        >
          🗓 {fmtDate(task.due_at)}
          {over ? " · vencida" : ""}
        </span>
      )}
      {task.contact_name && (
        <span className="text-[10px] font-mono text-accent border border-border px-1.5 py-0.5">
          @ {task.contact_name}
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
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setView("list")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 text-[11px] font-mono uppercase tracking-wider ${
            view === "list"
              ? "bg-accent text-white border-accent"
              : "border-border text-fg-muted"
          }`}
        >
          <ListIcon className="w-3.5 h-3.5" /> Lista
        </button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 border-2 text-[11px] font-mono uppercase tracking-wider ${
            view === "kanban"
              ? "bg-accent text-white border-accent"
              : "border-border text-fg-muted"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Kanban
        </button>
      </div>

      {/* Alta rápida */}
      <div className="mb-4 border-2 border-border p-3 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            Nueva tarea
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTask();
            }}
            placeholder="Ej. Enviar rider a Club X"
            className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          className="border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
        >
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          className="border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent max-w-[160px]"
        >
          <option value="">Sin contacto</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={addTask}
          className="px-4 py-2 bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-1 justify-center"
        >
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {err && <div className="text-xs text-danger mb-3">{err}</div>}

      {initialTasks.length === 0 ? (
        <p className="text-sm text-fg-muted border-2 border-dashed border-border p-6 text-center">
          Aún no tienes tareas. Crea la primera arriba.
        </p>
      ) : view === "list" ? (
        <div className="flex flex-col gap-2">
          {listOrder.map((t) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 border-2 border-border p-2.5 ${
                t.status === "hecho" ? "opacity-50" : ""
              }`}
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => toggleDone(t)}
                aria-label="Completar"
                className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center text-xs font-bold ${
                  t.status === "hecho"
                    ? "bg-accent text-white border-accent"
                    : "border-border"
                }`}
              >
                {t.status === "hecho" ? "✓" : ""}
              </button>
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-semibold ${
                    t.status === "hecho" ? "line-through" : ""
                  }`}
                >
                  {t.title}
                </div>
                <TaskChips task={t} />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => setEditing(t)}
                className="shrink-0 text-fg-muted hover:text-accent"
                title="Editar"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => removeTask(t)}
                className="shrink-0 text-danger hover:opacity-80"
                title="Eliminar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {COLUMNS.map((col, ci) => {
            const items = initialTasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="border-2 border-border flex flex-col">
                <div className="flex items-center justify-between px-3 py-2 bg-fg text-bg-panel">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold">
                    {col.label}
                  </span>
                  <span className="text-[9px] font-mono bg-accent text-white rounded-full px-2">
                    {items.length}
                  </span>
                </div>
                <div className="p-2 flex flex-col gap-2 flex-1 min-h-[80px]">
                  {items.length === 0 && (
                    <div className="text-[10px] font-mono text-fg-muted p-2">
                      — vacío —
                    </div>
                  )}
                  {items.map((t) => (
                    <div key={t.id} className="border-2 border-border bg-bg-panel p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-semibold leading-tight">
                          {t.title}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => setEditing(t)}
                            className="text-fg-muted hover:text-accent"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => removeTask(t)}
                            className="text-danger hover:opacity-80"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <TaskChips task={t} />
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                        <button
                          type="button"
                          disabled={pending || ci === 0}
                          onClick={() => moveStatus(t, -1)}
                          className="disabled:opacity-30 text-fg-muted hover:text-fg"
                          title="Mover a la izquierda"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={pending || ci === COLUMNS.length - 1}
                          onClick={() => moveStatus(t, 1)}
                          className="disabled:opacity-30 text-fg-muted hover:text-fg"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-bg-panel border-2 border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Editar tarea</h2>
          <button type="button" onClick={onClose} className="text-fg-muted hover:text-fg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
          Título
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent mb-3"
        />

        <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent mb-3"
        />

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
              Prioridad
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
              Fecha límite
            </label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <label className="block text-[10px] font-mono uppercase tracking-wider text-fg-muted mb-1">
          Contacto
        </label>
        <select
          value={contactId}
          onChange={(e) => setContactId(e.target.value)}
          className="w-full border-2 border-border bg-bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent mb-4"
        >
          <option value="">Sin contacto</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 border-2 border-border text-[11px] font-mono uppercase tracking-wider text-fg-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
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
            className="px-4 py-2 bg-accent text-white font-mono text-[11px] font-bold uppercase tracking-wider disabled:opacity-50"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
