/**
 * Layout del backoffice. Envuelve TODAS las páginas /admin con:
 *   - AdminNav: barra de navegación fija (sin depender del botón "atrás").
 *   - ConfirmProvider: diálogos de confirmación unificados (reemplazan
 *     window.confirm/prompt en los componentes hijos).
 * El gating de admin lo hace cada page vía assertAdmin().
 */
import { AdminNav } from "./admin-nav";
import { ConfirmProvider } from "@/components/admin/confirm-dialog";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConfirmProvider>
      <AdminNav />
      {children}
    </ConfirmProvider>
  );
}
