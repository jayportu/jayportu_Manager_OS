/**
 * /login — Server component que detecta invite tokens y pre-rellena el form.
 *
 * Si llega con `?invite=<token>`:
 *   - Validamos el token contra beta_requests (status=approved, no consumido).
 *   - Seteamos cookie HttpOnly por 30min con el request_id.
 *   - Pre-llenamos email + nombre artístico en el form.
 *   - Forzamos modo signup en lugar de login.
 *   - Mostramos banner naranja "Estás dentro · DROP. Beta".
 *
 * El consumo del invite (activar beta_status) ocurre en el primer ingreso
 * a `(app)/layout.tsx` después de que el user complete signup/login.
 */

import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";
import { startBetaInviteFlow } from "@/lib/queries/beta-invite";

interface PageProps {
  searchParams: Promise<{ invite?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  let invite: { email: string; artist_name: string } | null = null;
  if (sp.invite && typeof sp.invite === "string") {
    invite = await startBetaInviteFlow(sp.invite);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <Logo variant="wordmark" tone="ink" size={120} priority />
          <div className="text-[10px] uppercase tracking-[0.3em] text-fg-subtle mt-2 font-mono">
            — The DJ OS
          </div>
        </div>

        {/* Banner de invite (si aplica) */}
        {invite && (
          <div className="mb-5 border-2 border-ink bg-orange p-4">
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] mb-1">
              — ESTÁS DENTRO · BETA
            </div>
            <div className="text-sm leading-relaxed">
              Hola <strong>{invite.artist_name}</strong>, te aprobamos
              para la beta cerrada de DROP. Crea tu cuenta con el email{" "}
              <strong className="font-mono break-all">{invite.email}</strong>{" "}
              para activar tus 15 días.
            </div>
          </div>
        )}

        <LoginForm
          inviteEmail={invite?.email ?? null}
          inviteArtistName={invite?.artist_name ?? null}
        />

        <div className="text-center mt-6 text-[10px] uppercase tracking-widest text-fg-subtle font-mono">
          DROP. · THE DJ OS · v0.13
        </div>
      </div>
    </div>
  );
}
