import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";

/**
 * Cifrado en reposo de los tokens OAuth de Gmail (auditoría de seguridad).
 * AES-256-GCM (autenticado). DORMIDO por defecto: sin `GMAIL_TOKEN_ENC_KEY` los
 * tokens se guardan/leen en texto plano (comportamiento actual, sin romper nada).
 *
 * Al setear la llave en Vercel:
 *  - Los tokens nuevos se cifran (prefijo `enc:v1:`).
 *  - Al leer, se detecta el prefijo y se descifra; las filas legacy en texto
 *    plano se leen igual y se re-cifran solas en el próximo refresh del token
 *    (backfill orgánico — o correr un script una vez si se quiere inmediato).
 *
 * `GMAIL_TOKEN_ENC_KEY`: 64 hex (32 bytes) ideal; cualquier otro string se
 * deriva a 32 bytes con SHA-256.
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.GMAIL_TOKEN_ENC_KEY;
  if (!raw) return null;
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw, "utf8").digest();
}

/** ¿La app tiene la llave configurada? (para logs/health, no obligatorio). */
export function isGmailEncryptionEnabled(): boolean {
  return getKey() !== null;
}

/** Cifra un token. Sin llave → passthrough (dormido). */
export function encryptToken(plain: string | null | undefined): string {
  if (!plain) return plain ?? "";
  if (plain.startsWith(PREFIX)) return plain; // ya cifrado
  const key = getKey();
  if (!key) return plain; // dormido → texto plano
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

/**
 * Descifra si viene con prefijo. Si es legacy texto-plano (sin prefijo), lo
 * devuelve tal cual. Si está cifrado pero no hay llave (o está corrupto),
 * devuelve "" → fuerza re-autenticación en vez de crashear.
 */
export function decryptToken(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  const key = getKey();
  if (!key) return "";
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return "";
  }
}
