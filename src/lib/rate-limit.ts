import "server-only";

/**
 * Rate limiting minimalista in-memory para endpoints públicos sin auth.
 *
 * Cómo funciona:
 *   - Mantiene un Map<key, { count, resetAt }> en memoria del proceso.
 *   - Por cada request, incrementa el counter. Si supera `max` dentro
 *     de la `windowMs`, retorna { ok: false }.
 *   - El Map se resetea con cada cold start de la serverless function.
 *
 * Limitaciones (sé honesto):
 *   - Vercel hace cold starts → el counter NO sobrevive entre instancias
 *     de la misma función. Un atacante que distribuya el ataque entre
 *     muchos cold starts puede bypassear.
 *   - Múltiples instancias del mismo endpoint (autoscale) tienen Maps
 *     separados → el límite efectivo es ~N × max.
 *   - Para defensa robusta usar Cloudflare Rules (ya está delante de
 *     dropgigs.com) o Upstash Redis. Ver DROP_ROADMAP_PENDIENTE.md
 *     sección 13.
 *
 * Para qué sirve igual:
 *   - Mitiga abuso casual (un script que hace 100 POSTs/segundo desde
 *     una IP — el Map dentro del mismo warm start sí lo bloquea).
 *   - Defense in depth: incluso si alguien evade CF, este es otro layer.
 *
 * Uso típico:
 *   import { rateLimit } from "@/lib/rate-limit";
 *   const limit = rateLimit(req, { max: 10, windowMs: 60_000 });
 *   if (!limit.ok) return NextResponse.json({ error: "Demasiados requests" }, { status: 429 });
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Cleanup periódico: cada N inserts limpiamos buckets expirados para que
 * el Map no crezca indefinidamente. No usamos setInterval porque en
 * serverless functions el background timer no se garantiza.
 */
let insertsUntilCleanup = 1000;
function maybeCleanup() {
  if (--insertsUntilCleanup > 0) return;
  insertsUntilCleanup = 1000;
  const now = Date.now();
  // Array.from() evita el problema de iteración directa de Map con targets ES viejos
  for (const [key, b] of Array.from(buckets.entries())) {
    if (b.resetAt < now) buckets.delete(key);
  }
}

function getClientIp(req: Request): string {
  // M16: detrás de Cloudflare (dropgigs.com lo está), `cf-connecting-ip` es la
  // IP REAL del cliente y CF la sobrescribe — no es spoofeable por el cliente.
  // Va PRIMERO: x-forwarded-for puede traer la IP del edge de CF (compartida →
  // falsos 429 para usuarios distintos) o venir manipulada (evadible).
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export interface RateLimitOptions {
  /** Máximo de requests permitidos en la ventana. */
  max: number;
  /** Ventana de tiempo en milisegundos. */
  windowMs: number;
  /** Identificador del endpoint (para namespacing). Si no se da, usa "default". */
  key?: string;
}

export interface RateLimitResult {
  ok: boolean;
  /** Cuántos requests le quedan permitidos en la ventana. */
  remaining: number;
  /** Cuándo se resetea el contador (unix ms). */
  resetAt: number;
}

export function rateLimit(
  req: Request,
  opts: RateLimitOptions
): RateLimitResult {
  const ip = getClientIp(req);
  const ns = opts.key || "default";
  const key = `${ns}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, bucket);
    maybeCleanup();
  }
  bucket.count += 1;

  const ok = bucket.count <= opts.max;
  return {
    ok,
    remaining: Math.max(0, opts.max - bucket.count),
    resetAt: bucket.resetAt,
  };
}
