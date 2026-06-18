/**
 * Layout del backoffice. Envuelve TODAS las páginas /admin con:
 *   - AdminNav: barra de navegación fija (sin depender del botón "atrás").
 *   - ConfirmProvider: diálogos de confirmación unificados (reemplazan
 *     window.confirm/prompt en los componentes hijos).
 * El gating de admin lo hace cada page vía assertAdmin().
 */
import { AdminNav } from "./admin-nav";
import { ConfirmProvider } from "@/components/admin/confirm-dialog";
import { assertAdmin } from "@/lib/queries/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Piso de seguridad (auditoría 2026-06-18): además del assertAdmin() que llama
  // cada page, el layout gatea como red de seguridad. Así, si una página /admin
  // nueva olvida el chequeo, igual no expone el backoffice. assertAdmin() redirige
  // a /login (sin sesión) o /dashboard (no-admin).
  await assertAdmin();

  return (
    <ConfirmProvider>
      <AdminNav />
      {children}
    </ConfirmProvider>
  );
}
