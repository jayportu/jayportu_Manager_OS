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

export class AccountSuspendedError extends Error {
  constructor(banned: boolean) {
    super(
      banned
        ? "Tu cuenta de DROP fue cerrada. No puedes realizar esta acción."
        : "Tu cuenta de DROP está suspendida. No puedes realizar esta acción mientras dure la suspensión."
    );
    this.name = "AccountSuspendedError";
  }
}

/**
 * Guard de escritura para server actions / route handlers.
 *
 * Bloquea en dos casos:
 *   1. account_status 'suspended' / 'banned' (migración 0030) — un baneado
 *      seguía pudiendo invocar actions por POST directo aunque el layout lo
 *      redirige en cada página. La suspensión era solo cosmética; acá se
 *      hace real a nivel de acción.
 *   2. beta_status 'expired' — cuenta congelada hasta suscribirse.
 *
 * El orden importa: la suspensión gana sobre todo (incluso admin), porque un
 * admin suspendido no debería poder operar. Si la cuenta está activa, un admin
 * pasa el chequeo de beta sin restricción.
 *
 * Idempotente — usar al inicio de las server actions que crean o modifican.
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
    .select("beta_status, is_admin, account_status")
    .eq("user_id", user.id)
    .maybeSingle();

  // 1. Cuenta suspendida/baneada → bloquea siempre (incluso admin).
  if (data?.account_status === "suspended" || data?.account_status === "banned") {
    throw new AccountSuspendedError(data.account_status === "banned");
  }

  // 2. Admin con cuenta activa siempre pasa el chequeo de beta.
  if (data?.is_admin === true) return;

  // 3. beta_status 'expired' → congelado.
  if (data?.beta_status === "expired") {
    throw new BetaExpiredError();
  }
}
