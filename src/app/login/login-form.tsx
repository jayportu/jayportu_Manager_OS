"use client";

/**
 * Login form — antes era /login/page.tsx. Ahora es client component que
 * recibe el invite pre-fill como prop desde el server component.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GOOGLE_SCOPES } from "@/lib/gmail/scopes";

interface Props {
  inviteEmail: string | null;
  inviteArtistName: string | null;
}

/**
 * Mapea errores comunes de Supabase Auth a mensajes en chileno.
 * Si no matchea ninguno, devuelve el mensaje original.
 */
function translateSupabaseError(message: string, status?: number): string {
  const m = message.toLowerCase();
  if (status === 429 || m.includes("rate limit") || m.includes("too many requests")) {
    return "Demasiados intentos seguidos. Espera unos minutos e intenta de nuevo, o avísale al admin.";
  }
  if (m.includes("at least 6") || m.includes("password should")) {
    return "La contraseña debe tener mínimo 6 caracteres.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
    return "Email o contraseña incorrectos. ¿Es tu primera vez? Crea cuenta abajo.";
  }
  if (m.includes("email not confirmed")) {
    return "Aún no confirmas tu email. Revisa tu bandeja de entrada (también spam).";
  }
  if (m.includes("user already registered") || m.includes("already registered")) {
    return "Este email ya tiene cuenta. Usa 'Iniciar sesión' arriba.";
  }
  if (m.includes("invalid email") || m.includes("email address")) {
    return "El email no tiene formato válido.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Problema de conexión. Revisa tu internet e intenta de nuevo.";
  }
  // Fallback: devolvemos el mensaje pero con contexto
  return `${message}. Si persiste, escríbele al admin.`;
}

export function LoginForm({ inviteEmail, inviteArtistName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  // Si viene un invite, forzar signup como modo default
  const [mode, setMode] = useState<"login" | "signup">(
    inviteEmail ? "signup" : "login"
  );
  const [email, setEmail] = useState(inviteEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  /**
   * Login/signup con Google en un solo botón. Pedimos TODOS los scopes
   * (Gmail + Calendar) desde el principio para que el user otorgue una
   * sola vez y la conexión Gmail/Calendar quede lista en /auth/callback.
   *
   * access_type=offline + prompt=consent → Google entrega refresh_token
   * cada vez (sin esto, solo lo da en la primera autorización).
   *
   * El beta gate lo enforza el trigger DB enforce_beta_signup: si el
   * email de Google no está en beta_requests.status='approved', el
   * insert a auth.users falla y /auth/callback redirige a /login con
   * mensaje claro.
   */
  async function handleGoogleSignIn() {
    setError(null);
    setInfo(null);
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: GOOGLE_SCOPES.join(" "),
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) {
      setError(translateSupabaseError(error.message, error.status));
      setGoogleLoading(false);
    }
    // Si OK, Supabase redirige automáticamente a Google (no llegamos acá).
  }

  // Si el user vino con invite y cambia el email, mostrar warning
  const emailMismatch =
    inviteEmail !== null &&
    email.trim().length > 0 &&
    email.trim().toLowerCase() !== inviteEmail.toLowerCase();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(translateSupabaseError(error.message, error.status));
        setLoading(false);
        return;
      }
      router.refresh();
      router.push("/dashboard");
    } else {
      // Sprint S20 — Beta cerrada. Si no llegó con invite, refusamos signup
      // en el cliente como UX hint (la defensa real está en el trigger DB
      // 0029_enforce_beta_signup que rechaza el insert a auth.users). Sin
      // este check, alguien que llegue sin invite y manipule el modo via
      // DevTools vería un error opaco de Supabase en vez del mensaje claro.
      if (!inviteEmail) {
        setError(
          "La beta de DROP es cerrada. Para entrar, solicita acceso en dropgigs.com/beta."
        );
        setLoading(false);
        return;
      }
      // Validación adicional: si vino con invite, forzar email match.
      // El input está readOnly pero un user con devtools podría cambiarlo.
      if (inviteEmail && email.trim().toLowerCase() !== inviteEmail.toLowerCase()) {
        setError(
          `Para activar la beta tienes que usar el email ${inviteEmail}. Si necesitas otro, pídele al admin un invite nuevo.`
        );
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(translateSupabaseError(error.message, error.status));
        setLoading(false);
        return;
      }
      // Detección de email ya registrado: Supabase responde sin error pero
      // con identities=[]. Es el patrón documentado para "already registered".
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        setError(
          "Este email ya tiene cuenta. Usa 'Iniciar sesión' arriba con tu contraseña."
        );
        setLoading(false);
        return;
      }
      setInfo(
        "Te enviamos un email para confirmar tu cuenta. Revisa tu bandeja (también spam). El link dura unos minutos."
      );
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <h1 className="text-xl font-semibold mb-1">
        {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        {inviteArtistName
          ? `Hola ${inviteArtistName}, terminemos de activarte.`
          : mode === "login"
          ? "Bienvenido de vuelta."
          : "Crea tu cuenta y empieza a gestionar tu carrera como DJ."}
      </p>

      {/* Sprint 24 — Continuar con Google. Login + signup en un click,
          y deja Gmail/Calendar conectados de regalo. */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || loading}
        className="w-full inline-flex items-center justify-center gap-2.5 h-11 px-4 border-2 border-ink bg-white hover:bg-ink hover:text-orange font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors disabled:opacity-50 mb-4"
      >
        {/* Logo Google oficial */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {googleLoading ? "Redirigiendo…" : "Continuar con Google"}
      </button>

      {/* Divider "o" */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-ink/15" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-fg-subtle">
          o
        </span>
        <div className="flex-1 h-px bg-ink/15" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="hola@drop.dj"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            readOnly={!!inviteEmail}
            className={inviteEmail ? "bg-cream/60" : undefined}
          />
          {emailMismatch && (
            <div className="text-[11px] text-danger">
              Para activar la beta, usa el email{" "}
              <span className="font-mono">{inviteEmail}</span>.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </div>

        {error && (
          <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {info && (
          <div className="text-sm text-accent bg-accent-soft border border-accent/30 rounded-md px-3 py-2">
            {info}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Procesando…"
            : mode === "login"
            ? "Entrar"
            : "Crear cuenta"}
        </Button>
      </form>

      {/* Sprint S20 — Toggle login/signup. Sin invite, NO ofrecemos "Crear
          cuenta" (la beta es cerrada — el único camino para nuevos DJs es
          el form de /beta, mostrado en el bloque de abajo). Con invite, el
          user empieza en signup y puede volver a login si ya tiene cuenta. */}
      {inviteEmail && (
        <div className="text-center mt-6 text-sm text-fg-muted">
          {mode === "login" ? (
            <>
              ¿Primera vez?{" "}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setInfo(null);
                }}
              >
                Crear cuenta
              </button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setInfo(null);
                }}
              >
                Iniciar sesión
              </button>
            </>
          )}
        </div>
      )}

      {/* Sprint 23.5 — Cross-link a /beta para DJs sin cuenta aún */}
      {!inviteEmail && (
        <div className="border-t-2 border-ink/10 mt-6 pt-5 text-center">
          <div className="text-xs text-fg-muted mb-2">
            ¿Aún no tienes cuenta y eres DJ?
          </div>
          <a
            href="/beta"
            className="inline-flex items-center font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-orange hover:text-ink border-b border-orange hover:border-ink transition-colors"
          >
            Solicitar acceso a la beta →
          </a>
        </div>
      )}
    </Card>
  );
}
