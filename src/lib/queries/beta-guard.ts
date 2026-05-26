import "server-only";

/**
 * Sprint 23.5 — Guard server-side para bloquear acciones de "crear" cuando
 * el user beta está expired.
 *
 * Llamado desde server actions críticas (crear contacto, crear tracklist,
 * crear show, crear template, etc). Si el user está en beta_status='expired',
 * lanza un error que las actions convierten en mensaje user-friendly.
 *
 * Admin pasa siempre (sin restricciones).
 */

import { createClient } from "@/lib/supabase/server";

export class BetaExpiredError extends Error {
  constructor() {
    super(
      "Tu beta de DROP terminó. Para crear o modificar datos nuevos, necesitas suscribirte. Te contacto pronto con el flow."
    );
    this.name = "BetaExpiredError";
  }
}

/**
 * Lanza BetaExpiredError si el user actual tiene beta_status='expired'.
 * Acepta admins sin chequeo. Idempotente — usar al inicio de las server
 * actions que crean nuevas entidades.
 */
export async function assertBetaActive(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No autenticado");
  }
  const { data } = await supabase
    .from("dj_profile")
    .select("beta_status, is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  // Admin siempre pasa
  if (data?.is_admin === true) return;

  // Si beta_status es 'expired', bloquear
  if (data?.beta_status === "expired") {
    throw new BetaExpiredError();
  }
}
