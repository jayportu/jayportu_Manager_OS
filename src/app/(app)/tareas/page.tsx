import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { listMyTasks, listTaskContactOptions } from "@/lib/queries/tasks";
import { TasksView } from "./tasks-view";
import { SectionHero } from "@/components/hos";

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
      <SectionHero
        kicker="Agenda · Tareas"
        title="Tareas"
        sub="Tus pendientes en lista o tablero. Ponles prioridad, fecha límite y vincúlalos a un contacto si quieres."
      />

      <TasksView initialTasks={tasks} contacts={contacts} />
    </div>
  );
}
