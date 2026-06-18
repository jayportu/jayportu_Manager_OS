import { createHash, timingSafeEqual } from "crypto";

/**
 * Comparación de strings en tiempo constante (anti timing side-channel).
 *
 * Endurecimiento defensivo (auditoría 2026-06-18): los endpoints de cron
 * comparaban el header `Authorization` con `!==`, que no es constant-time y
 * teóricamente filtra longitud/prefijo por timing. Los webhooks (MP/Resend) ya
 * usaban `timingSafeEqual`; esto lleva el mismo patrón a los crons.
 *
 * Hasheamos ambos lados a SHA-256 antes de comparar para que los buffers
 * siempre tengan el mismo largo (timingSafeEqual lanza con largos distintos) y
 * para no filtrar la longitud del secreto.
 */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Helper de conveniencia: valida el header Authorization de un request de cron
 * contra `Bearer ${CRON_SECRET}` en tiempo constante. No decide el status code
 * (cada ruta mantiene su propio shape de respuesta); solo responde si coincide.
 */
export function cronAuthMatches(req: Request, expected: string): boolean {
  const auth = req.headers.get("authorization") || "";
  return safeEqual(auth, `Bearer ${expected}`);
}
