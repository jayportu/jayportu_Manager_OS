import "server-only";
import { lookup } from "node:dns/promises";

/**
 * Anti-SSRF: valida que una URL sea un endpoint HTTP(S) PÚBLICO antes de que el
 * server le haga fetch (ej: webhooks de auto-post configurados por el usuario).
 * Bloquea localhost, hostnames internos, IPs privadas/reservadas y la dirección
 * de metadata de cloud (169.254.169.254).
 *
 * Hay DOS niveles:
 *  - `isSafePublicHttpUrl` (sync): chequeo textual. Primera línea, sirve para
 *    validar al GUARDAR una URL (no hace red). NO resuelve DNS.
 *  - `isSafePublicHttpUrlResolved` (async): además resuelve el hostname y valida
 *    que TODAS las IPs resueltas sean públicas → cierra DNS rebinding (un dominio
 *    público que apunta a una IP interna). Usar en el sitio del `fetch`.
 */

/** ¿IP (v4/v6, o v4-mapped) en un rango privado/reservado/loopback/metadata? */
export function isPrivateOrReservedIp(ip: string): boolean {
  const addr = ip.toLowerCase().trim().replace(/^\[/, "").replace(/\]$/, "");

  // IPv4-mapped IPv6 (::ffff:1.2.3.4) → evaluar la parte v4
  const mapped = addr.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  const target = mapped ? mapped[1] : addr;

  // IPv4 literal
  const m = target.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127) return true; // this-network / loopback
    if (a === 10) return true; // 10/8 privado
    if (a === 169 && b === 254) return true; // link-local + metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 privado
    if (a === 192 && b === 168) return true; // 192.168/16 privado
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 CGNAT
    if (a >= 224) return true; // multicast / reservado
    return false;
  }

  // IPv6
  if (target === "::1" || target === "::") return true; // loopback / unspecified
  if (target.startsWith("fe80:")) return true; // link-local
  if (target.startsWith("fc") || target.startsWith("fd")) return true; // fc00::/7 unique-local
  return false;
}

/** Extrae el hostname de una URL válida http(s), o null. */
function safeHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  return u.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
}

function isIpLiteral(host: string): boolean {
  return host.includes(":") || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host);
}

export function isSafePublicHttpUrl(raw: string | null | undefined): boolean {
  const host = safeHost(raw);
  if (!host) return false;

  // localhost y sufijos de redes internas
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return false;
  }
  // hostname sin punto ni ":" → nombre interno tipo "router", "intranet"
  if (!host.includes(".") && !host.includes(":")) return false;

  // IP literal (v4/v6) en rango privado/reservado
  if (isIpLiteral(host) && isPrivateOrReservedIp(host)) return false;

  return true;
}

/**
 * Igual que `isSafePublicHttpUrl` PERO además resuelve el hostname por DNS y
 * valida que TODAS las IPs resueltas sean públicas (cierra DNS rebinding). Si el
 * DNS falla o alguna IP resuelta es privada/reservada → false.
 *
 * Residual conocido: queda una ventana TOCTOU (el DNS podría cambiar entre este
 * lookup y el `fetch`). Es aceptable acá — los endpoints que la usan están
 * autenticados y el daño es acotado; pinnear la IP en el connect rompería
 * SNI/TLS y es sobre-ingeniería para este caso.
 */
export async function isSafePublicHttpUrlResolved(
  raw: string | null | undefined
): Promise<boolean> {
  if (!isSafePublicHttpUrl(raw)) return false;
  const host = safeHost(raw);
  if (!host) return false;
  // IP literal → ya la validó isSafePublicHttpUrl; no hay DNS que resolver.
  if (isIpLiteral(host)) return true;
  try {
    const addrs = await lookup(host, { all: true });
    if (addrs.length === 0) return false;
    return addrs.every((a) => !isPrivateOrReservedIp(a.address));
  } catch {
    return false; // no se pudo resolver → no arriesgar el fetch
  }
}
