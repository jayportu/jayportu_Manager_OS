import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Registro de auditoría de seguridad (BL-03 · Ley 21.719).
 *
 * Escribe en la tabla append-only `security_audit_log` (RLS deny-all, ver
 * migración 0067) usando el cliente service_role. Es BEST-EFFORT: un fallo de
 * auditoría NUNCA debe romper la acción principal (no lanza).
 *
 * Qué registrar: acciones sensibles del backoffice (borrados, ban/suspensión,
 * verificación) y exportaciones de datos personales. Los cambios de `is_admin`
 * se registran solos vía trigger DB (catch-all), no hace falta llamar aquí.
 *
 * PII: no guardar tokens ni cuerpos; los emails deben ir enmascarados
 * (ver `maskEmail` en `@/lib/log-safe`). La IP es opcional y solo se guarda si
 * el llamador la provee (p. ej. desde un route handler con acceso a headers).
 */
export interface SecurityAuditEvent {
  /** Verbo namespaced, p. ej. 'admin.user_deleted', 'data.export'. */
  action: string;
  /** Quién ejecuta la acción (normalmente el admin). NULL = sistema. */
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logSecurityEvent(evt: SecurityAuditEvent): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("security_audit_log").insert({
      actor_user_id: evt.actorUserId ?? null,
      action: evt.action,
      target_type: evt.targetType ?? null,
      target_id: evt.targetId ?? null,
      metadata: evt.metadata ?? {},
      ip: evt.ip ?? null,
      user_agent: evt.userAgent ?? null,
    });
  } catch (e) {
    // Best-effort: registrar el fallo, pero no propagar (no romper la acción).
    console.error("[security-audit] no se pudo registrar el evento", {
      action: evt.action,
      err: e instanceof Error ? e.message : "error",
    });
  }
}

/** Extrae la IP del cliente de un Request (mismo criterio que rate-limit). */
export function clientIpFromRequest(req: Request): string | null {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}
