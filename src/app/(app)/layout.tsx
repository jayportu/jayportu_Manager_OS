import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { BottomNav } from "@/components/layout/bottom-nav";

/**
 * Layout protegido. Cualquier ruta dentro de (app) requiere sesión
 * y onboarding completado. Si falta cualquiera de los dos, redirige.
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

  const { data: profile } = await supabase
    .from("dj_profile")
    .select("onboarding_completed_at, is_admin, artist_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) redirect("/welcome");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar fijo (desktop) — se mantiene en su lugar, scrollea internamente si hace falta */}
      <Sidebar
        userEmail={user.email}
        isAdmin={profile?.is_admin === true}
        artistName={profile?.artist_name ?? null}
      />
      {/* Columna derecha: topbar fijo arriba + main scrolleable */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar userEmail={user.email} />
        <main
          className="flex-1 overflow-y-auto md:pb-0"
          style={{
            paddingBottom: "calc(5rem + env(safe-area-inset-bottom))",
          }}
        >
          {children}
        </main>
      </div>
      {/* Bottom nav (mobile only) — ya es fixed bottom-0 */}
      <BottomNav />
    </div>
  );
}
