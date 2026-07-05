/**
 * Utilidades para no filtrar PII (datos personales) en logs.
 *
 * Motivo (auditoría de privacidad, Ley 21.719): los logs de la app viajan a
 * Vercel y no tienen control de acceso a nivel de dato. Loguear emails o
 * nombres completos es exponer PII innecesaria. Preferimos identificadores
 * truncados o enmascarados que basten para correlacionar/depurar.
 */

/**
 * Enmascara un email para logs: conserva la primera letra del local y el
 * dominio, oculta el resto. Sirve para depurar (typos de dominio, mismatch)
 * sin registrar la dirección completa.
 *
 *   maskEmail("dj.ejemplo@gmail.com") -> "d***@gmail.com"
 *   maskEmail(null)                    -> "(sin email)"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "(sin email)";
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}
