import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

/**
 * Sprint S19 — Página de checkout de suscripción.
 *
 * Vive FUERA de (app) para que un user con trial vencido / sin
 * suscripción pueda llegar sin el modal de paywall bloqueando. Aún así
 * requiere sesión (si no, manda a /login).
 *
 * F2: stub mínimo con CTA + info. F3 reemplaza con el form real de
 * MercadoPago (card token + preapproval).
 */
export default async function SuscripcionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-cream text-ink p-6 md:p-10">
      <div className="max-w-xl mx-auto">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-orange mb-2">
          — SUSCRIPCIÓN · DROP. PRO
        </div>
        <h1
          className="leading-none mb-4"
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

        <div className="border-2 border-dashed border-ink/30 bg-white p-5 mb-6">
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted mb-2">
            — CHECKOUT
          </div>
          <p className="text-sm text-fg-muted">
            Esta página será el form de pago de MercadoPago (Fase 3 del sprint).
            Por ahora, si quieres reactivar tu cuenta, escríbeme a{" "}
            <a
              href="mailto:hola@jayportu.com"
              className="text-orange underline underline-offset-2"
            >
              hola@jayportu.com
            </a>
            .
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted hover:text-ink transition-colors"
        >
          ← Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
