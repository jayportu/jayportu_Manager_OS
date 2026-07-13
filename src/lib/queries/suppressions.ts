/**
 * Lista de bajas (email_suppressions) — un solo lugar con los correos a los
 * que NO hay que volver a escribir. Ver migración 0052.
 *
 * Escribe con service_role (salta RLS). `addSuppression` se llama desde
 * lugares públicos legítimos (webhook verificado, /api/unsubscribe rate-limited);
 * `listSuppressions`/`removeSuppression` SOLO desde rutas con assertAdmin().
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type SuppressionReason = "unsubscribe" | "bounced" | "complained" | "manual";

export interface SuppressionRow {
  id: string;
  email: string;
  reason: SuppressionReason;
  source: string | null;
  note: string | null;
  created_at: string;
}

function clean(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Agrega un correo a la lista de bajas (idempotente por email, case-insensitive).
 * No pisa una baja previa: si ya existe, no hace nada. Nunca lanza — el opt-out
 * no debe romper el flujo que lo llama (webhook / unsubscribe).
 */
export async function addSuppression(
  email: string,
  reason: SuppressionReason,
  source: string,
  note?: string
): Promise<void> {
  const e = clean(email);
  if (!e.includes("@")) return;
  try {
    const admin = createAdminClient();
    // `.eq` (no `.ilike`): el email ya viene normalizado (lowercase) y el índice
    // único es sobre lower(email) (migración 0052). Con `.ilike`, un email con
    // "_"/"%" (p.ej. maria_jose@gmail.com) los trataba como comodines → podía
    // matchear otra baja y saltarse el insert de la baja real (seguía enviando).
    const { data: existing } = await admin
      .from("email_suppressions")
      .select("id")
      .eq("email", e)
      .maybeSingle();
    if (existing) return;
    await admin
      .from("email_suppressions")
      .insert({ email: e, reason, source, note: note ?? null });
  } catch (err) {
    console.error("[suppressions] addSuppression", (err as Error).message);
  }
}

/** Lista completa para la vista de /admin/bajas (más recientes primero). */
export async function listSuppressions(): Promise<SuppressionRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("email_suppressions")
    .select("id, email, reason, source, note, created_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    console.error("[suppressions] list", error.message);
    return [];
  }
  return (data ?? []) as SuppressionRow[];
}

export interface SuppressionCounts {
  total: number;
  byReason: Record<string, number>;
}

export async function getSuppressionCounts(): Promise<SuppressionCounts> {
  const rows = await listSuppressions();
  const byReason: Record<string, number> = {};
  for (const r of rows) byReason[r.reason] = (byReason[r.reason] ?? 0) + 1;
  return { total: rows.length, byReason };
}

/**
 * ¿Este correo está en la lista de bajas? Para chequear antes de enviar en
 * crons de lifecycle (defensa además de la supresión propia de Resend).
 * Fail-open: ante un error transitorio devuelve false (no bloquea toda la
 * corrida); el backstop real es la supresión a nivel Resend.
 */
export async function isSuppressed(email: string): Promise<boolean> {
  const e = clean(email);
  if (!e.includes("@")) return false;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("email_suppressions")
      .select("id")
      .eq("email", e)
      .maybeSingle();
    return !!data;
  } catch (err) {
    console.error("[suppressions] isSuppressed", (err as Error).message);
    return false;
  }
}

/** Quita un correo de la lista de bajas (re-suscribir). Solo admin. */
export async function removeSuppression(email: string): Promise<void> {
  const admin = createAdminClient();
  // `.eq` (no `.ilike`): con `.ilike` un email con "_"/"%" borraba TODAS las
  // filas que matcheaban el patrón → re-suscribía en silencio a otros usuarios
  // que sí habían pedido la baja. El email ya viene normalizado (lowercase).
  await admin.from("email_suppressions").delete().eq("email", clean(email));
}

/**
 * Detecta una intención de baja en el cuerpo/asunto de un correo entrante.
 * Conservador: palabra "bajar" suelta, "unsubscribe", "desuscribir", "baja"
 * o "no quiero / no recibir ... correos". Evita falsos como "trabajar".
 */
export function looksLikeUnsubscribe(text: string): boolean {
  const t = (text || "").toLowerCase();
  return (
    /\bbajar\b/.test(t) ||
    /\bunsubscribe\b/.test(t) ||
    /\bdesuscrib/.test(t) ||
    /\bdar(me)?\s+de\s+baja\b/.test(t) ||
    /\bno\s+(quiero|deseo)\s+(recibir|más)\b/.test(t)
  );
}
