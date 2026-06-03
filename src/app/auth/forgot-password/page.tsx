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

interface PageProps {
  searchParams: Promise<{ error?: string; email?: string }>;
}

export default async function ForgotPasswordPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const expired = sp.error === "expired";
  const initialEmail = typeof sp.email === "string" ? sp.email : "";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-10">
          <Logo variant="wordmark" tone="ink" size={120} priority />
          <div className="text-[10px] uppercase tracking-[0.3em] text-fg-subtle mt-2 font-mono">
            — The DJ OS
          </div>
        </div>

        {expired && (
          <div className="mb-5 border-2 border-danger bg-danger/10 p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-danger mb-1">
              — LINK EXPIRADO
            </div>
            <div className="text-sm text-fg leading-relaxed">
              El link para restablecer tu contraseña expiró o ya se usó. Pide uno
              nuevo abajo — dura solo unos minutos.
            </div>
          </div>
        )}

        <ForgotPasswordForm initialEmail={initialEmail} />

        <div className="text-center mt-6 text-xs text-fg-muted leading-relaxed">
          ¿Problemas para entrar?
          <br />
          <a
            href="mailto:hola@dropgigs.com"
            className="text-ink underline hover:text-orange transition-colors"
          >
            hola@dropgigs.com
          </a>
        </div>
      </div>
    </div>
  );
}
