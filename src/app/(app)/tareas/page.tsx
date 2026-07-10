import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listMyTasks, listTaskContactOptions } from "@/lib/queries/tasks";
import { TasksView } from "./tasks-view";
import { ListChecks } from "lucide-react";

/**
 * Fase 6 — Tareas. Reemplaza el placeholder ComingSoon.
 * Lista + Kanban de pendientes, con vínculo opcional a un contacto del CRM.
 */
export const dynamic = "force-dynamic";

export default async function TareasPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");

  const [tasks, contacts] = await Promise.all([
    listMyTasks(),
    listTaskContactOptions(),
  ]);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <ListChecks className="w-6 h-6 text-accent" />
          Tareas
        </h1>
        <p className="text-sm text-fg-muted mt-1 max-w-xl">
          Tus pendientes en lista o tablero. Ponles prioridad, fecha límite y
          vincúlalos a un contacto si quieres.
        </p>
      </div>

      <TasksView initialTasks={tasks} contacts={contacts} />
    </div>
  );
}
