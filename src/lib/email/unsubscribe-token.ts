import "server-only";
import crypto from "node:crypto";

/**
 * Token firmado (HMAC-SHA256) para los links de "darse de baja".
 *
 * SEGURIDAD: antes /api/unsubscribe daba de baja cualquier email pasado en
 * `?email=`, sin prueba de que el solicitante fuera el dueño. Un atacante
 * podía suprimir a terceros de las campañas (denial-of-communication). Ahora
 * el link lleva `?u=<token>` donde el token = base64url(email) + HMAC(email).
 * El endpoint deriva el email del token verificado, así nadie puede dar de
 * baja un email que no le firmamos nosotros al enviarle el correo.
 *
 * La key es un secret server-only de alta entropía. Si UNSUBSCRIBE_SECRET no
 * está seteado, cae al SERVICE_ROLE_KEY (siempre presente en prod). HMAC no
 * expone la key. Si el key rota, los links viejos dejan de validar (aceptable:
 * son transitorios y el usuario siempre puede escribir a hola@dropgigs.com).
 */
function getSecret(): string {
  const s =
    process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Falta UNSUBSCRIBE_SECRET / SUPABASE_SERVICE_ROLE_KEY");
  return s;
}

function hmac(email: string): string {
  return crypto.createHmac("sha256", getSecret()).update(email).digest("base64url");
}

/** Firma un token de baja para `email`. */
export function signUnsubscribeToken(email: string): string {
  const e = email.trim().toLowerCase();
  return `${Buffer.from(e).toString("base64url")}.${hmac(e)}`;
}

/** Verifica el token y devuelve el email, o null si es inválido/forjado. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let email: string;
  try {
    email = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!email.includes("@")) return null;
  const expected = hmac(email);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return email;
}
