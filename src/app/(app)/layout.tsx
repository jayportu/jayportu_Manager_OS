import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { NpsModal } from "@/components/feedback/nps-modal";
import { BetaExpiredModal } from "@/components/feedback/beta-expired-modal";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { getBetaState } from "@/lib/beta-status";
import { consumeBetaInviteIfAny } from "@/lib/queries/beta-invite";

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

  // Sprint 23.5 — si hay cookie de invite pendiente, activar beta antes
  // de leer el profile. Idempotente y best-effort.
  await consumeBetaInviteIfAny({
    userId: user.id,
    userEmail: user.email ?? null,
  });

  const { data: profile } = await supabase
    .from("dj_profile")
    .select("onboarding_completed_at, is_admin, artist_name, avatar_url, beta_status, beta_approved_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.onboarding_completed_at) redirect("/welcome");

  // El widget de feedback flotante solo aparece a beta users activos
  // o al admin (para que pueda probar el widget también).
  const showFeedbackWidget =
    profile?.beta_status === "active" || profile?.is_admin === true;

  // Estado beta para banner y NPS modal
  const betaState = await getBetaState({
    userId: user.id,
    betaStatus: profile?.beta_status ?? null,
    betaApprovedAt: profile?.beta_approved_at ?? null,
  });

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar fijo (desktop) — se mantiene en su lugar, scrollea internamente si hace falta */}
      <Sidebar
        userEmail={user.email}
        isAdmin={profile?.is_admin === true}
        artistName={profile?.artist_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      {/* Columna derecha: topbar fijo arriba + main scrolleable */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar
          userEmail={user.email}
          betaDaysRemaining={betaState.daysRemaining}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      {/* Menú mobile (drawer desplegable) — reemplaza BottomNav */}
      <MobileMenu
        userEmail={user.email}
        isAdmin={profile?.is_admin === true}
        artistName={profile?.artist_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      {/* Sprint 23.5 — Widget feedback flotante (beta users + admin) */}
      {showFeedbackWidget && <FeedbackWidget />}
      {/* Sprint 23.5 — Modal NPS día 7 / día 15 (solo beta active con hito pendiente) */}
      {betaState.pendingNps && <NpsModal milestone={betaState.pendingNps} />}
      {/* Sprint 23.5 — Tracker silent de page_view (cero impacto en LCP) */}
      <PageViewTracker />
      {/* Sprint 23.5 — Modal bloqueante cuando beta expiró (admin queda exento) */}
      {profile?.beta_status === "expired" && !profile?.is_admin && (
        <BetaExpiredModal />
      )}
    </div>
  );
}
