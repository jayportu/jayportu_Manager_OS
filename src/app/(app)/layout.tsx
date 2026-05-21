import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * Layout protegido. Cualquier ruta dentro de (app) requiere sesión.
 * Si no hay user, el middleware ya lo redirigió, pero validamos también acá.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar userEmail={user.email} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar userEmail={user.email} />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
