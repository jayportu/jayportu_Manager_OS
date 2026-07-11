/**
 * F0 · Lógica PURA del gate de bookers.
 *
 * Separada de `booker-guard.ts` (que sí toca Supabase y "server-only") para
 * poder testearla con `node --test` sin arrastrar next/headers ni el cliente
 * de Supabase. Decide, dado el estado de la cuenta booker, si puede operar; el
 * caller (`assertBookerActive`) mapea el veredicto a errores tipados.
 */

export interface BookerAccessInput {
  /** "active" | "suspended" | "banned" (ver ACCOUNT_STATUSES). */
  account_status: string;
  verified_at: string | null;
}

export type BookerAccessReason =
  | "no_account"
  | "suspended"
  | "banned"
  | "not_verified";

export type BookerAccessVerdict =
  | { ok: true }
  | { ok: false; reason: BookerAccessReason };

/**
 * Reglas (en orden de prioridad):
 *   1. Sin fila de booker → `no_account`.
 *   2. `banned` / `suspended` → bloqueado SIEMPRE (gana sobre verificación).
 *   3. `requireVerified` y sin `verified_at` → `not_verified`.
 *   4. En cualquier otro caso → ok.
 */
export function evaluateBookerAccess(
  booker: BookerAccessInput | null | undefined,
  opts?: { requireVerified?: boolean }
): BookerAccessVerdict {
  if (!booker) return { ok: false, reason: "no_account" };
  if (booker.account_status === "banned") return { ok: false, reason: "banned" };
  if (booker.account_status === "suspended") {
    return { ok: false, reason: "suspended" };
  }
  if (opts?.requireVerified && !booker.verified_at) {
    return { ok: false, reason: "not_verified" };
  }
  return { ok: true };
}
