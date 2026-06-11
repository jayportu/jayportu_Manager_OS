import "server-only";

/**
 * Anti-SSRF: valida que una URL sea un endpoint HTTP(S) PÚBLICO antes de que el
 * server le haga fetch (ej: webhooks de auto-post configurados por el usuario).
 * Bloquea localhost, hostnames internos, IPs privadas/reservadas y la dirección
 * de metadata de cloud (169.254.169.254).
 *
 * Nota honesta: NO resuelve DNS, así que un hostname público que resuelva a una
 * IP privada (DNS rebinding) igual pasaría. Es la defensa de primera línea
 * (bloquea el 99% del abuso casual: localhost, IPs internas, metadata). Para
 * blindaje total haría falta resolver + validar la IP final antes del connect.
 */
export function isSafePublicHttpUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;

  const host = u.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

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

  // IPv6 loopback (::1) / link-local (fe80::) / unique-local (fc00::/7)
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) {
    return false;
  }

  // IPv4 literal en rangos privados / reservados
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 127) return false; // this-network / loopback
    if (a === 10) return false; // 10/8 privado
    if (a === 169 && b === 254) return false; // link-local + metadata cloud
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16/12 privado
    if (a === 192 && b === 168) return false; // 192.168/16 privado
    if (a === 100 && b >= 64 && b <= 127) return false; // 100.64/10 CGNAT
    if (a >= 224) return false; // multicast / reservado
  }

  return true;
}
