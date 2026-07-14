import { getCachedUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { PresenceHeartbeat } from "@/components/dj/presence-heartbeat";
import { Topbar } from "@/components/layout/topbar";
import { MobileMenu } from "@/components/layout/mobile-menu";
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
 * Guard en memoria (por instancia del server) para no re-ejecutar el consumo
 * de invite en CADA navegación. consumeBetaInviteIfAny es idempotente y
 * best-effort, así que un reset en cold start solo lo corre una vez más — sin
 * riesgo. Mismo patrón que booker/layout.tsx.
 */
const invitesConsumed = new Set<string>();

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
  // de leer el profile. Idempotente y best-effort. Solo la primera vez por
  // instancia (guard en memoria) — evita re-correr el fallback por email en
  // cada navegación.
  if (!invitesConsumed.has(user.id)) {
    await consumeBetaInviteIfAny({
      userId: user.id,
      userEmail: user.email ?? null,
    });
    invitesConsumed.add(user.id);
  }

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

  // Estado beta (banner/NPS) y suscripción son independientes entre sí → se
  // resuelven en paralelo (antes: dos awaits en serie). La suscripción solo se
  // consulta si NO es beta legacy ni admin: misma condición que antes, así se
  // preserva el side-effect (getOrCreateSubscription no corre para esos users).
  const isLegacyBeta = isLegacyBetaUser(profile?.beta_status);
  const [betaState, subscription] = await Promise.all([
    getBetaState({
      userId: user.id,
      betaStatus: profile?.beta_status ?? null,
      betaApprovedAt: profile?.beta_approved_at ?? null,
    }),
    isLegacyBeta || profile?.is_admin
      ? Promise.resolve(null)
      : getOrCreateSubscription(user.id),
  ]);

  // Sprint S19 — Subscription gating (sistema paralelo a beta).
  const subscriptionAccess =
    subscription === null ? null : evaluateSubscriptionAccess(subscription);
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
      {/* Hybrid OS — campo ambiente naranja detrás del shell: gradientes radiales
          puros (sin blur/backdrop-filter propio → costo cero), para que el
          sidebar/topbar glass (que sí llevan backdrop-filter) tengan algo de
          color cálido que difuminar. Fixed + z-0 + primer hijo del shell:
          pinta detrás de Sidebar/Topbar/main (que son position:relative sin
          z-index propio, así que se apilan después en el orden del DOM).
          Mismo recipe que el mockup aprobado en
          `src/app/ui-experiments/app-redesign/_kit/shell.tsx`. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(75% 55% at 88% -8%, rgba(232,90,12,0.17), transparent 60%)," +
            "radial-gradient(60% 55% at -8% 6%, rgba(232,90,12,0.13), transparent 55%)," +
            "radial-gradient(55% 60% at 55% 118%, rgba(110,168,254,0.05), transparent 60%)",
        }}
      />
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
        showLugares={showLugares}
      />
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
