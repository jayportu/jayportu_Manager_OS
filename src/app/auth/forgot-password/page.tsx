/**
 * /auth/forgot-password — Solicitud de reset de contraseña.
 *
 * Ruta pública (vive bajo /auth, ya allowlisteado en el middleware). El
 * formulario llama resetPasswordForEmail; el email sale por el SMTP de
 * Supabase (Resend). El link del email vuelve por /auth/callback y
 * aterriza en /auth/reset-password.
 *
 * Si un link de recovery expira/ya se usó, el callback redirige acá con
 * ?error=expired para que el user pida uno nuevo sin pasar por /login.
 */

import { Logo } from "@/components/brand/logo";
import { ForgotPasswordForm } from "./forgot-password-form";
import { Alert } from "@/components/hos";

interface PageProps {
  searchParams: Promise<{ error?: string; email?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const expired = sp.error === "expired";
  const initialEmail = typeof sp.email === "string" ? sp.email : "";

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

        {expired && (
          <div className="mb-5">
            <Alert tone="danger" title="— LINK EXPIRADO">
              El link para restablecer tu contraseña expiró o ya se usó. Pide uno
              nuevo abajo — dura solo unos minutos.
            </Alert>
          </div>
        )}

        <ForgotPasswordForm initialEmail={initialEmail} />

        <div className="text-center mt-6 text-xs text-fg-muted leading-relaxed">
          ¿Problemas para entrar?
          <br />
          <a
            href="mailto:hola@dropgigs.com"
            className="text-fg underline hover:text-orange transition-colors"
          >
            hola@dropgigs.com
          </a>
        </div>
      </div>
    </div>
  );
}
