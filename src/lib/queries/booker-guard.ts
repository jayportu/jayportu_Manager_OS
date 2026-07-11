import "server-only";

/**
 * F0 · Guard server-side de cuentas de booker.
 *
 * Análogo a `assertBetaActive` (beta-guard.ts) pero para bookers: ese guard lee
 * `dj_profile` y por tanto era un NO-OP para bookers (nunca encuentra fila → la
 * suspensión de un booker era puramente cosmética en el layout). Este cierra esa
 * brecha: se llama al inicio de TODA server action / route handler de booker que
 * escriba o revele datos, de modo que un booker suspendido/baneado no pueda
 * operar por POST directo aunque el layout lo redirija.
 *
 * La lógica de decisión vive en `booker-access.ts` (pura, testeable). Acá solo
 * se hace el fetch y se mapea el veredicto a errores tipados que las actions
 * convierten en mensajes user-friendly.
 */

import { getCachedUser } from "@/lib/supabase/server";
import { AccountSuspendedError } from "@/lib/queries/beta-guard";
import { evaluateBookerAccess } from "@/lib/queries/booker-access";
import type { AccountStatus } from "@/types/database";

/** El user autenticado no tiene fila en `booker_accounts` (p.ej. es un DJ). */
export class NoBookerAccountError extends Error {
  constructor() {
    super("No tienes una cuenta de booker. Esta acción es solo para bookers.");
    this.name = "NoBookerAccountError";
  }
}

/** La acción requiere verificación y la cuenta aún no está verificada. */
export class BookerNotVerifiedError extends Error {
  constructor() {
    super(
      "Tu cuenta debe estar verificada para hacer esto. Solicita la verificación desde tu perfil."
    );
    this.name = "BookerNotVerifiedError";
  }
}

export interface BookerGuardRow {
  account_status: AccountStatus;
  verified_at: string | null;
  is_founding: boolean;
  in_directory: boolean;
  accepts_pitches: boolean;
}

/**
 * Exige que el user actual sea un booker que puede operar.
 *
 * Lanza:
 *   - `Error("No autenticado")` si no hay sesión.
 *   - `NoBookerAccountError` si no existe fila de booker.
 *   - `AccountSuspendedError` si está suspended/banned (reusa el error de DJ para
 *     mensajes consistentes).
 *   - `BookerNotVerifiedError` si `requireVerified` y la cuenta no está verificada.
 *
 * Devuelve `{ supabase, user, booker }` para que el caller reutilice el cliente
 * user-scoped y evite un segundo `getUser()`.
 */
export async function assertBookerActive(opts?: {
  requireVerified?: boolean;
}): Promise<{
  supabase: Awaited<ReturnType<typeof getCachedUser>>["supabase"];
  user: NonNullable<Awaited<ReturnType<typeof getCachedUser>>["user"]>;
  booker: BookerGuardRow;
}> {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");

  const { data } = await supabase
    .from("booker_accounts")
    .select(
      "account_status, verified_at, is_founding, in_directory, accepts_pitches"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const booker = (data as BookerGuardRow | null) ?? null;
  const verdict = evaluateBookerAccess(booker, opts);
  if (!verdict.ok) {
    switch (verdict.reason) {
      case "no_account":
        throw new NoBookerAccountError();
      case "banned":
        throw new AccountSuspendedError(true);
      case "suspended":
        throw new AccountSuspendedError(false);
      case "not_verified":
        throw new BookerNotVerifiedError();
    }
  }
  // verdict.ok === true ⇒ booker no es null (evaluateBookerAccess devuelve
  // no_account para null), pero TS no puede enlazarlo → cast seguro.
  return { supabase, user, booker: booker as BookerGuardRow };
}

/**
 * Variante que NO lanza: devuelve el mismo `{ supabase, user, booker }` o
 * `{ error }` con el mensaje ya traducido. Encaja con el tipo `Result`
 * (`{ ok:false; error }`) de las server actions:
 *
 *   const g = await guardBookerActive();
 *   if ("error" in g) return { ok: false, error: g.error };
 *   const { supabase, user } = g;
 */
export async function guardBookerActive(opts?: {
  requireVerified?: boolean;
}): Promise<Awaited<ReturnType<typeof assertBookerActive>> | { error: string }> {
  try {
    return await assertBookerActive(opts);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No autorizado." };
  }
}
