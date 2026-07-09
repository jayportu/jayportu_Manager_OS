import { ComingSoon } from "@/components/coming-soon";

/**
 * /tareas — placeholder de beta cerrada. La feature aún no existe;
 * se muestra en el menú (badge "PRÓXIMAMENTE") con esta pantalla informativa.
 */
export default function TareasPage() {
  return (
    <ComingSoon
      title="Tareas"
      description="Organiza tus pendientes ligados a gigs, contactos y campañas, en vista de lista o tablero."
      bullets={[
        "Tareas con fecha límite y prioridad",
        "Vinculadas a un contacto, un gig o una campaña",
        "Vista lista y tablero Kanban",
      ]}
    />
  );
}
