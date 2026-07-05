/**
 * BL-02 · Backfill de cifrado en reposo de tokens Gmail (auditoría privacidad).
 *
 * Re-cifra las filas legacy de `gmail_connections` cuyos tokens están en TEXTO
 * PLANO (sin prefijo `enc:v1:`). Reutiliza EXACTAMENTE el formato de
 * `src/lib/gmail/token-crypto.ts` (AES-256-GCM, base64(iv|tag|ct)) y verifica
 * un roundtrip antes de tocar nada. Idempotente: salta lo ya cifrado.
 *
 * ⚠️ ESCRIBE EN PRODUCCIÓN (`.env.local` apunta a la BD real). NO lo corre el
 * asistente. Requiere `GMAIL_TOKEN_ENC_KEY` seteada (la misma que en Vercel).
 *
 * Nota: NO es estrictamente necesario — la app re-cifra cada token solo en su
 * próximo refresh. Este script solo adelanta ese backfill.
 *
 * Uso:
 *   node scripts/backfill_gmail_token_encryption.mjs           # DRY-RUN (no escribe)
 *   node scripts/backfill_gmail_token_encryption.mjs --apply   # aplica (escribe prod)
 *
 * Verificación posterior (manual): abrir una cuenta con Gmail conectado y
 * confirmar que la sincronización sigue funcionando (la app descifra bien).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

// ── Cargar .env.local (mismo patrón que otros scripts del repo) ──
try {
  const envText = readFileSync(".env.local", "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* si no hay .env.local, se asume env inyectada */
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENC_KEY_RAW = process.env.GMAIL_TOKEN_ENC_KEY;
const APPLY = process.argv.includes("--apply");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}
if (!ENC_KEY_RAW) {
  console.error(
    "FALTA GMAIL_TOKEN_ENC_KEY. Sin la llave no se puede cifrar (el cifrado está 'dormido')."
  );
  process.exit(1);
}

// ── Crypto: réplica EXACTA de src/lib/gmail/token-crypto.ts ──
const PREFIX = "enc:v1:";
function getKey() {
  if (/^[0-9a-f]{64}$/i.test(ENC_KEY_RAW)) return Buffer.from(ENC_KEY_RAW, "hex");
  return createHash("sha256").update(ENC_KEY_RAW, "utf8").digest();
}
const KEY = getKey();

function encryptToken(plain) {
  if (!plain) return plain ?? "";
  if (plain.startsWith(PREFIX)) return plain; // ya cifrado
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}
function decryptToken(stored) {
  if (!stored || !stored.startsWith(PREFIX)) return stored ?? "";
  const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const d = createDecipheriv("aes-256-gcm", KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

// ── Self-test de roundtrip ANTES de tocar la BD ──
const probe = `roundtrip-${randomBytes(8).toString("hex")}`;
const enc = encryptToken(probe);
if (!enc.startsWith(PREFIX) || decryptToken(enc) !== probe) {
  console.error("ABORT: self-test de cifrado falló (formato no coincide). No se tocó la BD.");
  process.exit(1);
}
console.log("✔ self-test de cifrado OK (roundtrip verificado)");

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const { data: rows, error } = await db
  .from("gmail_connections")
  .select("user_id, access_token, refresh_token");
if (error) {
  console.error("Error leyendo gmail_connections:", error.message);
  process.exit(1);
}

let plaintextAccess = 0;
let plaintextRefresh = 0;
let updated = 0;
const isPlain = (v) => typeof v === "string" && v.length > 0 && !v.startsWith(PREFIX);

for (const r of rows || []) {
  const patch = {};
  if (isPlain(r.access_token)) {
    plaintextAccess++;
    patch.access_token = encryptToken(r.access_token);
  }
  if (isPlain(r.refresh_token)) {
    plaintextRefresh++;
    patch.refresh_token = encryptToken(r.refresh_token);
  }
  if (Object.keys(patch).length === 0) continue;

  if (APPLY) {
    const { error: upErr } = await db
      .from("gmail_connections")
      .update(patch)
      .eq("user_id", r.user_id);
    if (upErr) {
      console.error(`  ✗ user ${String(r.user_id).slice(0, 8)}: ${upErr.message}`);
    } else {
      updated++;
    }
  }
}

console.log(
  `Filas: ${(rows || []).length} · access_token en texto plano: ${plaintextAccess} · refresh_token en texto plano: ${plaintextRefresh}`
);
if (APPLY) {
  console.log(`✔ Filas re-cifradas: ${updated}`);
} else {
  console.log("DRY-RUN (no se escribió nada). Corre con --apply para aplicar en producción.");
}
