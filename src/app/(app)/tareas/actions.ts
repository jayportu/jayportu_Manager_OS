"use server";

/**
 * Server actions de Tareas (Fase 6). Delegan en lib/queries/tasks.ts,
 * aplican el guard de beta y revalidan /tareas.
 */
import {
  createTask,
  updateTask,
  setTaskStatus,
  deleteTask,
  type TaskStatus,
  type TaskPriority,
} from "@/lib/queries/tasks";
import { assertBetaActive } from "@/lib/queries/beta-guard";
import { revalidatePath } from "next/cache";

type Result = { ok: true } | { ok: false; error: string };

async function guard(): Promise<string | null> {
  try {
    await assertBetaActive();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : "No autorizado.";
  }
}

export interface TaskFormValues {
  title: string;
  notes: string;
  priority: TaskPriority;
  due_at: string; // "" = sin fecha (input type=date → "YYYY-MM-DD")
  contact_id: string; // "" = sin contacto
}

export async function createTaskAction(values: TaskFormValues): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  if (!values.title.trim()) return { ok: false, error: "Ponle un título a la tarea." };
  try {
    await createTask({
      title: values.title,
      notes: values.notes,
      priority: values.priority,
      due_at: values.due_at || null,
      contact_id: values.contact_id || null,
    });
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function updateTaskAction(
  id: string,
  values: TaskFormValues
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  if (!values.title.trim()) return { ok: false, error: "El título es obligatorio." };
  try {
    await updateTask(id, {
      title: values.title,
      notes: values.notes,
      priority: values.priority,
      due_at: values.due_at || null,
      contact_id: values.contact_id || null,
    });
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function setTaskStatusAction(
  id: string,
  status: TaskStatus
): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await setTaskStatus(id, status);
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}

export async function deleteTaskAction(id: string): Promise<Result> {
  const blocked = await guard();
  if (blocked) return { ok: false, error: blocked };
  try {
    await deleteTask(id);
    revalidatePath("/tareas");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error." };
  }
}
