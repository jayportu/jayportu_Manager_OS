/**
 * /auth/reset-password — Fijar la nueva contraseña tras el reset.
 *
 * El user llega acá desde el link del email, que pasó por /auth/callback
 * (intercambió el code → sesión de recovery). Validamos esa sesión con
 * getUser(): si existe, mostramos el form para fijar la clave; si no
 * (link expirado, abierto en otro navegador, o entrada directa), lo
 * mandamos de vuelta a pedir un link nuevo.
 *
 * Ruta pública (bajo /auth, ya allowlisteada en el middleware).
 */

import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/brand/logo";
import { GlassPanel, MonoLabel } from "@/components/hos";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 bg-bg">
      {/* Ambiente radial (firma Hybrid OS, como /login y otras públicas) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(90% 70% at 50% -10%, rgb(var(--drop-orange) / 0.14), transparent 60%)",
        }}
      />
      <div className="relative z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <Logo variant="wordmark" tone="ink" size={120} priority />
          <div className="text-[10px] uppercase tracking-[0.3em] text-fg-subtle mt-2 font-mono">
            — The DJ OS
          </div>
        </div>

        {user ? (
          <ResetPasswordForm />
        ) : (
          <GlassPanel padded={false} className="p-8">
            <MonoLabel>LINK INVÁLIDO</MonoLabel>
            <h1 className="mt-2 font-display text-3xl leading-none mb-2">
              Link inválido o expirado
            </h1>
            <p className="text-sm text-fg-muted leading-relaxed mb-6">
              Este link para restablecer tu contraseña ya no es válido. Los links
              duran solo unos minutos y se usan una sola vez. Pide uno nuevo y
              ábrelo en el mismo dispositivo donde lo solicitaste.
            </p>
            <a
              href="/auth/forgot-password"
              className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-orange hover:text-fg border-b border-orange hover:border-border transition-colors"
            >
              Pedir un link nuevo →
            </a>
          </GlassPanel>
        )}

        <div className="text-center mt-6 text-sm text-fg-muted">
          <a href="/login" className="text-accent hover:underline">
            ← Volver a iniciar sesión
          </a>
        </div>
      </div>
    </div>
  );
}
