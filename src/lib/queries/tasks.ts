import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import { listContacts } from "@/lib/queries/contacts";

/**
 * Tareas (Fase 6): gestor de pendientes del DJ (lista + Kanban).
 * Tabla `tasks` (migración 0068). Independiente de follow_ups (CRM por contacto).
 * Lecturas RESILIENTES: si la tabla aún no existe, devuelven vacío en vez de lanzar.
 */

export type TaskStatus = "por_hacer" | "en_progreso" | "hecho";
export type TaskPriority = "alta" | "normal" | "baja";

export interface Task {
  id: string;
  title: string;
  notes: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;
  contact_id: string | null;
  contact_name: string | null;
  position: number;
  created_at: string;
  done_at: string | null;
}

export interface TaskContactOption {
  id: string;
  name: string;
}

type TaskRow = Omit<Task, "contact_name">;

const COLS =
  "id, title, notes, priority, status, due_at, contact_id, position, created_at, done_at";

async function requireUser() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

/** Todas las tareas del DJ, con el nombre del contacto vinculado (si hay). */
export async function listMyTasks(): Promise<Task[]> {
  const { supabase, user } = await getCachedUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("tasks")
    .select(COLS)
    .eq("user_id", user.id)
    .order("position", { ascending: true });
  if (error) return []; // tabla ausente / error → resiliente
  const rows = (data ?? []) as TaskRow[];

  // Resolver nombre de contacto en JS (evita depender del embed de PostgREST).
  const ids = Array.from(
    new Set(rows.map((r) => r.contact_id).filter((v): v is string => !!v))
  );
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: cs } = await supabase
      .from("contacts")
      .select("id, name")
      .eq("user_id", user.id)
      .in("id", ids);
    for (const c of (cs ?? []) as { id: string; name: string }[]) {
      nameById.set(c.id, c.name);
    }
  }
  return rows.map((r) => ({
    ...r,
    contact_name: r.contact_id ? nameById.get(r.contact_id) ?? null : null,
  }));
}

/** Contactos del usuario para el selector (id + nombre). */
export async function listTaskContactOptions(): Promise<TaskContactOption[]> {
  try {
    const contacts = await listContacts({ orderBy: "name" });
    return contacts.map((c) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}

export interface CreateTaskInput {
  title: string;
  notes?: string | null;
  priority?: TaskPriority;
  due_at?: string | null;
  contact_id?: string | null;
}

export async function createTask(input: CreateTaskInput): Promise<void> {
  const { supabase, user } = await requireUser();
  // position = al final (mayor position + 1 entre las del usuario)
  const { data: last } = await supabase
    .from("tasks")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);
  const pos = ((last?.[0]?.position as number | undefined) ?? -1) + 1;
  const { error } = await supabase.from("tasks").insert({
    user_id: user.id,
    title: input.title.trim().slice(0, 200),
    notes: input.notes?.trim().slice(0, 2000) || null,
    priority: input.priority ?? "normal",
    status: "por_hacer",
    due_at: input.due_at || null,
    contact_id: input.contact_id || null,
    position: pos,
  });
  if (error) throw new Error(error.message);
}

export interface UpdateTaskInput {
  title: string;
  notes?: string | null;
  priority: TaskPriority;
  due_at?: string | null;
  contact_id?: string | null;
}

export async function updateTask(id: string, patch: UpdateTaskInput): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .update({
      title: patch.title.trim().slice(0, 200),
      notes: patch.notes?.trim().slice(0, 2000) || null,
      priority: patch.priority,
      due_at: patch.due_at || null,
      contact_id: patch.contact_id || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

/** Cambia el estado; setea done_at al pasar a "hecho", lo limpia al reabrir. */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { supabase, user } = await requireUser();
  const done_at = status === "hecho" ? new Date().toISOString() : null;
  const { error } = await supabase
    .from("tasks")
    .update({ status, done_at })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteTask(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}
