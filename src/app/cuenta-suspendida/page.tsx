import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { GlassPanel, MonoLabel } from "@/components/hos";
import { Button } from "@/components/ui/button";

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

  // La cuenta puede ser DJ (dj_profile) o booker (booker_accounts). Miramos las
  // dos: un user es una o la otra, no ambas. (Migration 0063 sumó el estado a
  // booker_accounts; antes esta página solo miraba dj_profile → un booker
  // suspendido no veía nada y quedaba en loop.)
  const [{ data: dj }, { data: booker }] = await Promise.all([
    supabase
      .from("dj_profile")
      .select("account_status, account_status_reason, is_admin")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("booker_accounts")
      .select("account_status, account_status_reason")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const isAdmin = !!dj?.is_admin;
  const djBlocked =
    dj?.account_status === "suspended" || dj?.account_status === "banned";
  const bookerBlocked =
    booker?.account_status === "suspended" ||
    booker?.account_status === "banned";

  // Admin o ninguno bloqueado → no tiene nada que hacer acá. "/" enruta según rol.
  if (isAdmin || (!djBlocked && !bookerBlocked)) {
    redirect("/");
  }

  const status = djBlocked ? dj!.account_status : booker!.account_status;
  const isBanned = status === "banned";
  const reason =
    (djBlocked ? dj!.account_status_reason : booker!.account_status_reason)?.trim() ||
    null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-fg flex items-center justify-center p-6">
      {/* Ambiente radial (firma Hybrid OS, como el resto de Público) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 50% -10%, rgb(var(--drop-orange) / 0.10), transparent 60%)",
        }}
      />
      <div className="relative z-10 max-w-lg w-full">
        <div className="mb-2">
          <MonoLabel className="text-[10px] tracking-[0.15em]">DROP.</MonoLabel>
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

        <GlassPanel className="mb-6">
          {isBanned ? (
            <p className="text-sm leading-relaxed">
              Tu cuenta fue cerrada de forma permanente por incumplimiento de
              nuestros{" "}
              <Link
                href="/terms"
                className="text-fg underline hover:text-orange transition-colors"
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
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-fg-muted mb-1">
                — Motivo
              </div>
              <p className="text-sm text-fg">{reason}</p>
            </div>
          )}
        </GlassPanel>

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
          <Button type="submit" variant="clay">
            ← Cerrar sesión
          </Button>
        </form>
      </div>
    </div>
  );
}
