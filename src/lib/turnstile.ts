import "server-only";

/**
 * Cloudflare Turnstile — verificación server-side del token del CAPTCHA.
 *
 * Patrón "dormido" (igual que Resend): si no hay `TURNSTILE_SECRET_KEY`, la
 * verificación es un no-op (`ok: true, skipped`) → no rompe nada hasta que se
 * configuren las llaves. Se usa SOLO en endpoints propios (ej. /api/beta).
 *
 * OJO: login/signup/reset NO pasan por acá — usan el SDK de Supabase directo,
 * así que su CAPTCHA se valida con el CAPTCHA nativo de Supabase (mismo secret
 * cargado en el dashboard de Supabase → Auth → Bot & Abuse Protection).
 */

const SECRET = process.env.TURNSTILE_SECRET_KEY;
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return !!SECRET;
}

/**
 * Valida el token contra Cloudflare. Sin secret configurado → `skipped`
 * (dormido). Con secret pero sin token → falla.
 */
export async function verifyTurnstile(
  token: string | undefined,
  ip?: string
): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!SECRET) return { ok: true, skipped: true };
  if (!token) return { ok: false };
  try {
    const form = new URLSearchParams();
    form.set("secret", SECRET);
    form.set("response", token);
    if (ip && ip !== "unknown") form.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success?: boolean };
    return { ok: !!data.success };
  } catch {
    // Ante un fallo de red con Cloudflare no bloqueamos al usuario legítimo.
    return { ok: true, skipped: true };
  }
}
