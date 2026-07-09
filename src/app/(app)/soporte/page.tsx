import { ComingSoon } from "@/components/coming-soon";

/**
 * /soporte — placeholder de beta cerrada. La feature aún no existe;
 * se muestra en el menú (badge "PRÓXIMAMENTE") con esta pantalla informativa.
 */
export default function SoportePage() {
  return (
    <ComingSoon
      title="Soporte"
      description="Un canal de ayuda dentro de DROP para resolver dudas y reportar problemas, sin salir de la app."
      bullets={[
        "Escríbenos sin salir de DROP",
        "Seguimiento del estado de tus consultas",
        "Respuesta directa del equipo DROP",
      ]}
    />
  );
}
