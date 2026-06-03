"use client";

/**
 * Cambiar (o fijar) contraseña para usuarios ya logueados.
 *
 * Usa supabase.auth.updateUser({ password }) con la sesión activa — no
 * pide la clave actual (Supabase no la verifica de todas formas). Sirve
 * también para quienes entraron solo con Google y quieren además dejar
 * una contraseña propia para poder entrar sin OAuth.
 */

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { translateSupabaseError } from "@/lib/auth-errors";

export function ChangePasswordSection() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden. Escríbelas de nuevo.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(translateSupabaseError(error.message, error.status));
      setLoading(false);
      return;
    }
    setPassword("");
    setConfirm("");
    setSuccess(true);
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="new-password">Nueva contraseña</Label>
        <Input
          id="new-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setSuccess(false);
          }}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Repite la contraseña</Label>
        <Input
          id="confirm-password"
          type="password"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setSuccess(false);
          }}
          required
          minLength={6}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm text-accent bg-accent-soft border border-accent/30 rounded-md px-3 py-2">
          Listo, tu contraseña quedó actualizada.
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
