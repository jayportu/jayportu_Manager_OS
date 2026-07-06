import { getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { PresenceHeartbeat } from "@/components/dj/presence-heartbeat";
import { Topbar } from "@/components/layout/topbar";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { NpsModal } from "@/components/feedback/nps-modal";
import { BetaExpiredModal } from "@/components/feedback/beta-expired-modal";
import { SubscriptionRequiredModal } from "@/components/subscription/subscription-required-modal";
import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { GoogleScopeBanner } from "@/components/gmail/google-scope-banner";
import { getBetaState } from "@/lib/beta-status";
import { consumeBetaInviteIfAny } from "@/lib/queries/beta-invite";
import { hasDirectoryVenues } from "@/lib/queries/booker";
import {
  getOrCreateSubscription,
  evaluateSubscriptionAccess,
  isLegacyBetaUser,
} from "@/lib/queries/subscription";
import { isMpConfigured } from "@/lib/mercadopago/client";
import { ConfirmProvider } from "@/components/admin/confirm-dialog";

/**
 * Layout protegido. Cualquier ruta dentro de (app) requiere sesión
 * y onboarding completado. Si falta cualquiera de los dos, redirige.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getCachedUser();

  if (!user) redirect("/login");

  // Sprint 23.5 — si hay cookie de invite pendiente, activar beta antes
  // de leer el profile. Idempotente y best-effort.
  await consumeBetaInviteIfAny({
    userId: user.id,
    userEmail: user.email ?? null,
  });

  const { data: profile } = await supabase
    .from("dj_profile")
    .select("onboarding_completed_at, is_admin, artist_name, avatar_url, beta_status, beta_approved_at, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  // Migration 0030 — Moderación de cuentas: un user suspendido o baneado
  // (y NO admin) no entra a la app. Máxima prioridad, antes que onboarding.
  if (
    !profile?.is_admin &&
    (profile?.account_status === "suspended" ||
      profile?.account_status === "banned")
  ) {
    redirect("/cuenta-suspendida");
  }

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

  // Sprint S19 — Subscription gating (sistema paralelo a beta).
  // Solo aplica a users que NO son beta legacy (active/expired). Para
  // users post-launch (beta_status='none' o 'paying'), gestionamos el
  // ciclo trial/paying/expired.
  const isLegacyBeta = isLegacyBetaUser(profile?.beta_status);
  const subscriptionAccess = isLegacyBeta || profile?.is_admin
    ? null
    : evaluateSubscriptionAccess(await getOrCreateSubscription(user.id));
  // Soft-gate: si MP no está configurado (prod sin billing activo todavía, o
  // dev), NO bloqueamos aunque el trial venza — encerrar a alguien sin vía de
  // pago solo lo pierde. El banner de trial sigue mostrándose como aviso.
  const subscriptionBlocked =
    subscriptionAccess !== null &&
    !subscriptionAccess.hasAccess &&
    isMpConfigured();
  const trialDaysRemaining =
    subscriptionAccess?.reason === "trial"
      ? subscriptionAccess.daysRemaining
      : null;

  // Stats del sidebar: total de contactos + gigs (shows) del mes actual.
  // Conteos livianos (head: true → no traen filas, solo el count). RLS los
  // scopea al user. Mismo criterio de mes que getFinanceKpis (hora local).
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nextMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    1
  ).toISOString();
  const [{ count: contactCount }, { count: gigsThisMonth }, showLugares] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("calendar_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "show")
        .gte("start_at", monthStart)
        .lt("start_at", nextMonth),
      // "Lugares" solo en el sidebar si hay venues verificados (si no, página vacía).
      hasDirectoryVenues(),
    ]);

  return (
    <ConfirmProvider>
    {/* Latido de presencia: marca al DJ como "LIVE" para los bookers. */}
    <PresenceHeartbeat />
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar fijo (desktop) — se mantiene en su lugar, scrollea internamente si hace falta */}
      <Sidebar
        userEmail={user.email}
        isAdmin={profile?.is_admin === true}
        artistName={profile?.artist_name ?? null}
        avatarUrl={profile?.avatar_url ?? null}
        contactCount={contactCount ?? undefined}
        gigsThisMonth={gigsThisMonth ?? undefined}
        showLugares={showLugares}
      />
      {/* Columna derecha: topbar fijo arriba + main scrolleable */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar
          userEmail={user.email}
          betaDaysRemaining={betaState.daysRemaining}
          trialDaysRemaining={trialDaysRemaining}
        />
        {/* Sprint 24 — Banner proactivo: faltan scopes de Google */}
        <GoogleScopeBanner />
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
      {/* Sprint S19 — Modal bloqueante para trial vencido / suscripción
          expirada (sistema paralelo a beta; admin exento; legacy beta
          users gestionados arriba). */}
      {subscriptionBlocked && subscriptionAccess && (
        <SubscriptionRequiredModal
          reason={
            subscriptionAccess.reason === "past_due"
              ? "past_due"
              : subscriptionAccess.reason === "trial_expired"
                ? "trial_expired"
                : "subscription_expired"
          }
        />
      )}
    </div>
    </ConfirmProvider>
  );
}
