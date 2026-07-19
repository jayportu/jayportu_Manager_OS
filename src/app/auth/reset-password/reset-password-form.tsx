"use client";

/**
 * Formulario para fijar la nueva contraseña.
 *
 * Solo se renderiza cuando el server component ya validó que hay una
 * sesión de recovery activa (el callback la creó al intercambiar el code
 * del email). Llama supabase.auth.updateUser({ password }); al terminar,
 * el user queda logueado y lo mandamos a "/" (RootPage rutea por tipo).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlassPanel, MonoLabel, Alert, FIELD } from "@/components/hos";
import { translateSupabaseError } from "@/lib/auth-errors";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
    setDone(true);
    setLoading(false);
    // Ya quedó logueado con la nueva clave — lo llevamos a su panel.
    router.refresh();
    router.push("/");
  }

  if (done) {
    return (
      <GlassPanel padded={false} className="p-8">
        <MonoLabel>CONTRASEÑA ACTUALIZADA</MonoLabel>
        <h1 className="mt-2 font-display text-3xl leading-none mb-2">¡Listo!</h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          Tu contraseña quedó actualizada. Te estamos llevando a tu panel…
        </p>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel padded={false} className="p-8">
      <MonoLabel>NUEVA CONTRASEÑA</MonoLabel>
      <h1 className="mt-2 font-display text-3xl leading-none mb-1">
        Crea tu nueva contraseña
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        Elige una contraseña nueva para tu cuenta. Mínimo 6 caracteres.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            autoFocus
            className={FIELD}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Repite la contraseña</Label>
          <Input
            id="confirm"
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className={FIELD}
          />
        </div>

        {error && <Alert tone="danger">{error}</Alert>}

        <Button
          type="submit"
          variant="clayPrimary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Guardando…" : "Guardar contraseña"}
        </Button>
      </form>
    </GlassPanel>
  );
}
