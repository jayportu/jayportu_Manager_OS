"use client";

/**
 * Formulario de solicitud de reset de contraseña.
 *
 * Llama supabase.auth.resetPasswordForEmail con redirectTo apuntando a
 * /auth/callback?next=/auth/reset-password. El callback intercambia el
 * code por sesión (igual que el flow de Google/confirmación) y deja al
 * user en /auth/reset-password con una sesión de recovery activa para
 * que pueda fijar su nueva clave.
 *
 * El email lo manda Supabase Auth por el SMTP configurado (Resend), no
 * la lib src/lib/email. Por seguridad NO revelamos si el email existe o
 * no: siempre mostramos el mismo mensaje de éxito.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";
import { translateSupabaseError } from "@/lib/auth-errors";
import { TurnstileWidget, TURNSTILE_ENABLED } from "@/components/turnstile-widget";

export function ForgotPasswordForm({ initialEmail }: { initialEmail: string }) {
  const supabase = createClient();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (TURNSTILE_ENABLED && !captchaToken) {
      setError("Completa la verificación anti-bot.");
      setLoading(false);
      return;
    }

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      "/auth/reset-password"
    )}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
      captchaToken: captchaToken || undefined,
    });
    // El token es de un solo uso → re-montar el widget para el próximo intento
    // (incluye el botón "Reenviar" del estado sent).
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
    if (error) {
      setError(translateSupabaseError(error.message, error.status));
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <GlassPanel padded={false} className="p-8">
        <MonoLabel>REVISA TU EMAIL</MonoLabel>
        <h1 className="mt-2 font-display text-3xl leading-none mb-2">
          Revisa tu email
        </h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          Si existe una cuenta con{" "}
          <span className="font-mono text-fg break-all">{email.trim()}</span>,
          te enviamos un link para restablecer tu contraseña. Revisa tu bandeja
          de entrada (y también la carpeta de spam). El link dura unos minutos.
        </p>
        <div className="mt-6 text-sm text-fg-muted">
          ¿No te llegó?{" "}
          <button
            type="button"
            className="text-accent hover:underline"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            Reenviar
          </button>
        </div>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel padded={false} className="p-8">
      <MonoLabel>RECUPERAR ACCESO</MonoLabel>
      <h1 className="mt-2 font-display text-3xl leading-none mb-1">
        ¿Olvidaste tu contraseña?
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        Escribe tu email y te enviamos un link para crear una contraseña nueva.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className={FIELD}
          />
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        {TURNSTILE_ENABLED && (
          <TurnstileWidget
            key={captchaKey}
            onVerify={setCaptchaToken}
            onExpire={() => setCaptchaToken(null)}
          />
        )}

        <Button
          type="submit"
          variant="clayPrimary"
          size="lg"
          className="w-full"
          disabled={loading || (TURNSTILE_ENABLED && !captchaToken)}
        >
          {loading ? "Enviando…" : "Enviarme el link"}
        </Button>
      </form>

      <div className="text-center mt-6 text-sm text-fg-muted">
        <a href="/login" className="text-accent hover:underline">
          ← Volver a iniciar sesión
        </a>
      </div>
    </GlassPanel>
  );
}
