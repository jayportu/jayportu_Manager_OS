import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Migration 0030 — Pantalla para usuarios suspendidos o baneados.
 *
 * Vive FUERA de (app) para no entrar en loop de redirect con el layout
 * protegido. Requiere sesión. Si la cuenta está activa (o es admin), lo
 * mandamos de vuelta al dashboard.
 */
export default async function CuentaSuspendidaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("dj_profile")
    .select("account_status, account_status_reason, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  // Si no está bloqueado (o es admin), no tiene nada que hacer acá
  if (
    profile?.is_admin ||
    (profile?.account_status !== "suspended" &&
      profile?.account_status !== "banned")
  ) {
    redirect("/dashboard");
  }

  const isBanned = profile?.account_status === "banned";
  const reason = profile?.account_status_reason?.trim() || null;

  return (
    <div className="min-h-screen bg-cream text-ink flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-orange mb-2">
          — DROP.
        </div>
        <h1
          className="leading-none mb-4"
          style={{
            fontFamily: "var(--font-anton), Impact, system-ui, sans-serif",
            fontSize: "clamp(36px, 6vw, 52px)",
          }}
        >
          {isBanned ? "Cuenta cerrada" : "Cuenta suspendida"}
          <span className="text-orange">.</span>
        </h1>

        <div className="border-2 border-ink bg-bg-panel p-5 mb-6">
          {isBanned ? (
            <p className="text-sm leading-relaxed">
              Tu cuenta fue cerrada de forma permanente por incumplimiento de
              nuestros{" "}
              <Link
                href="/terms"
                className="text-ink underline hover:text-orange transition-colors"
              >
                Términos de servicio
              </Link>
              . No puedes seguir usando DROP. con esta cuenta.
            </p>
          ) : (
            <p className="text-sm leading-relaxed">
              Tu cuenta está suspendida temporalmente. Mientras dure la
              suspensión no puedes acceder a la app. Si crees que es un error o
              quieres regularizar tu situación, escríbenos y lo revisamos.
            </p>
          )}

          {reason && (
            <div className="mt-4 pt-4 border-t border-ink/15">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted mb-1">
                — Motivo
              </div>
              <p className="text-sm text-fg">{reason}</p>
            </div>
          )}
        </div>

        <p className="text-sm text-fg-muted mb-6">
          ¿Dudas o quieres apelar? Escríbenos a{" "}
          <a
            href="mailto:hola@dropgigs.com"
            className="text-orange hover:underline font-semibold"
          >
            hola@dropgigs.com
          </a>
          {" "}desde el email de tu cuenta.
        </p>

        {/* POST (no GET): /logout solo cierra sesión por POST → evita CSRF de logout. */}
        <form method="POST" action="/logout">
          <button
            type="submit"
            className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-fg-muted hover:text-ink transition-colors"
          >
            ← Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
