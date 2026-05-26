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

interface Props {
  inviteEmail: string | null;
  inviteArtistName: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
        setError(error.message);
        setLoading(false);
        return;
      }
      router.refresh();
      router.push("/dashboard");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setInfo(
        "Te enviamos un email para confirmar tu cuenta. Revisa tu bandeja."
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
