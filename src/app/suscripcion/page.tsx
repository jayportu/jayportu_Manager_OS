import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckoutForm } from "./checkout-form";
import {
  getOrCreateSubscription,
  evaluateSubscriptionAccess,
  isLegacyBetaUser,
} from "@/lib/queries/subscription";

export const dynamic = "force-dynamic";

/**
 * Sprint S19 — Página de checkout de suscripción.
 *
 * Vive FUERA de (app) para que un user con trial vencido / sin
 * suscripción pueda llegar sin el modal de paywall bloqueando. Aún así
 * requiere sesión (si no, manda a /login).
 *
 * Si el user ya tiene suscripción activa, lo redirigimos a la pantalla
 * de gestión (F4).
 */
export default async function SuscripcionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Si el user es legacy beta, no debería estar acá — el flow de beta
  // tiene su propio lockout. Lo mandamos al dashboard.
  const { data: profile } = await supabase
    .from("dj_profile")
    .select("beta_status, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.is_admin || isLegacyBetaUser(profile?.beta_status as never)) {
    redirect("/dashboard");
  }

  // Si ya está pagando, mostramos un estado distinto
  const subscription = await getOrCreateSubscription(user.id);
  const access = evaluateSubscriptionAccess(subscription);
  const isPaying =
    access.reason === "active" || subscription.status === "active";

  return (
    <div className="min-h-screen bg-cream text-ink p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-orange mb-2">
          — SUSCRIPCIÓN · DROP. PRO
        </div>
        <h1
          className="leading-none mb-2"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "56px",
          }}
        >
          $10.000<span className="text-orange">.</span>
        </h1>
        <p className="text-fg-muted mb-6 max-w-md">
          Por mes. Pagas con tarjeta. Cancelas cuando quieras desde tu
          configuración.
        </p>

        {/* Beneficios */}
        <div className="border-2 border-ink bg-white p-5 mb-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange mb-2">
            — INCLUIDO
          </div>
          <ul className="text-sm space-y-1.5">
            <li>· CRM completo + campañas masivas</li>
            <li>· Press kit público con tu URL propia</li>
            <li>· Calendario con Google Calendar</li>
            <li>· Stats de growth en todas tus redes</li>
            <li>· Avisos automáticos a tus bookers</li>
            <li>· Soporte directo conmigo (Jaime)</li>
          </ul>
        </div>

        {isPaying ? (
          <div className="border-2 border-success bg-success/10 p-5 mb-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-success mb-1">
              — YA ESTÁS SUSCRITO
            </div>
            <p className="text-sm">
              Tu suscripción está activa. Puedes gestionarla desde Configuración.
            </p>
            <Link
              href="/configuracion/suscripcion"
              className="inline-flex items-center mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-orange hover:text-ink border-b border-orange hover:border-ink transition-colors"
            >
              Ir a mi suscripción →
            </Link>
          </div>
        ) : (
          <CheckoutForm userEmail={user.email ?? ""} />
        )}

        <Link
          href="/dashboard"
          className="inline-flex items-center mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted hover:text-ink transition-colors"
        >
          ← Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
