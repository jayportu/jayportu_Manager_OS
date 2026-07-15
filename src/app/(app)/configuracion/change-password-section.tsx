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
import { Label } from "@/components/ui/label";
import { GlassPanel, Alert, FIELD } from "@/components/hos";
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
    <GlassPanel className="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nueva contraseña</Label>
          <input
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
            className={FIELD}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Repite la contraseña</Label>
          <input
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
            className={FIELD}
          />
        </div>

        {error && <Alert tone="danger">{error}</Alert>}
        {success && (
          <Alert tone="success">Listo, tu contraseña quedó actualizada.</Alert>
        )}

        <Button type="submit" variant="clayPrimary" disabled={loading}>
          {loading ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </GlassPanel>
  );
}
