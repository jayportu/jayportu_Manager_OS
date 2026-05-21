"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-md">
        {/* Wordmark */}
        <div className="text-center mb-8">
          <div className="wordmark text-5xl leading-none">
            <span className="block text-fg">JAY</span>
            <span className="block text-accent">PORTU</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-fg-subtle mt-3">
            Manager OS
          </div>
        </div>

        <Card className="p-8">
          <h1 className="text-xl font-semibold mb-1">
            {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="text-sm text-fg-muted mb-6">
            {mode === "login"
              ? "Bienvenido de vuelta."
              : "Solo para uso personal de Jaime."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="hola@jayportu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
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
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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
        </Card>

        <div className="text-center mt-6 text-[10px] uppercase tracking-widest text-fg-subtle">
          Costo $0 · Personal · v0.1
        </div>
      </div>
    </div>
  );
}
