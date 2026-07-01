/**
 * Cliente Gmail API (server-side).
 * Maneja el refresh automático del access_token cuando expira.
 *
 * Desde el cambio a "solo enviar" (scopes.ts) este cliente NO lee la bandeja:
 * solo expone `sendEmail` (scope gmail.send). Las funciones de lectura
 * (listThreads/getThread/…) y createDraft se eliminaron junto con los scopes
 * restringidos que requerían.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "./oauth";
import { encryptToken, decryptToken } from "./token-crypto";
import type { GmailConnection } from "@/types/database";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

// SEGURIDAD (auditoría 2026-06-13): la tabla gmail_connections guarda los
// tokens OAuth de Google (acceso al correo del DJ). Las leíamos/escribíamos con
// el client de sesión (anon key), lo que dejaba que el dueño los leyera DIRECTO
// desde el navegador vía PostgREST (`GET /rest/v1/gmail_connections`). Un XSS o
// una extensión maliciosa podía exfiltrar el refresh token (acceso permanente,
// sobrevive al cambio de clave). Ahora los tokens SOLO se tocan con el client
// service_role en el servidor, y la migración 0056 quita las policies que los
// exponían al cliente. La aislación por usuario la garantiza el `.eq("user_id")`
// explícito en cada query (service_role bypasea RLS, así que el filtro es la
// única barrera — no se puede omitir).
async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

/**
 * Obtiene la conexión Gmail del user actual. Si el access_token está
 * por expirar (margin 60s), lo refresca automáticamente y guarda en DB.
 */
export async function getGmailToken(): Promise<{
  accessToken: string;
  googleEmail: string;
} | null> {
  const { user } = await getUserOrThrow();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("gmail_connections")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (error || !data) return null;
  const conn = data as GmailConnection;

  const expiresAt = new Date(conn.expires_at).getTime();
  const now = Date.now();

  if (expiresAt - now > 60 * 1000) {
    return {
      accessToken: decryptToken(conn.access_token),
      googleEmail: conn.google_email,
    };
  }

  // Refresh (el refresh_token puede estar cifrado en reposo → descifrar antes)
  try {
    const fresh = await refreshAccessToken(decryptToken(conn.refresh_token));
    const newExpiresAt = new Date(
      Date.now() + fresh.expires_in * 1000
    ).toISOString();
    await admin
      .from("gmail_connections")
      .update({
        access_token: encryptToken(fresh.access_token),
        expires_at: newExpiresAt,
        token_type: fresh.token_type,
      })
      .eq("user_id", user.id);
    return { accessToken: fresh.access_token, googleEmail: conn.google_email };
  } catch (e) {
    console.error("refreshAccessToken error:", e);
    return null;
  }
}

/**
 * Revoca un token OAuth en Google (best-effort). Revocar el refresh_token
 * invalida también todos sus access_tokens. https://oauth2.googleapis.com/revoke
 */
async function revokeGoogleToken(token: string): Promise<void> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }).toString(),
      signal: controller.signal,
    });
    clearTimeout(t);
  } catch {
    // best-effort: si Google no responde, igual borramos la conexión local
  }
}

export async function deleteGmailConnection(): Promise<void> {
  const { user } = await getUserOrThrow();
  const admin = createAdminClient();
  // Revoca el token en Google ANTES de borrar la fila. Sin esto, el token
  // seguía VÁLIDO en Google (acceso al correo del DJ) hasta que lo revocara a
  // mano. Best-effort: un fallo de red no debe impedir la desconexión local —
  // la intención del user (desconectar) manda. (Auditoría seguridad 2026-06-13.)
  const { data } = await admin
    .from("gmail_connections")
    .select("refresh_token, access_token")
    .eq("user_id", user.id)
    .maybeSingle();
  const conn = data as { refresh_token?: string; access_token?: string } | null;
  const token =
    decryptToken(conn?.refresh_token) || decryptToken(conn?.access_token);
  if (token) await revokeGoogleToken(token);
  await admin.from("gmail_connections").delete().eq("user_id", user.id);
}

// ─── Gmail API: enviar ────────────────────────────────────────────────

/** Codifica un string a base64url (sin padding), como lo pide la Gmail API. */
function toBase64Url(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Header con tildes/ñ → encoded-word UTF-8 (RFC 2047), si no es ASCII. */
function encodeHeaderWord(str: string): string {
  return /[^\x00-\x7F]/.test(str)
    ? `=?UTF-8?B?${Buffer.from(str, "utf-8").toString("base64")}?=`
    : str;
}

/** base64 de un string UTF-8, partido en líneas de 76 chars (RFC 2045). */
function b64Body(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/(.{76})/g, "$1\r\n");
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Texto plano → HTML simple y limpio (sin imágenes ni tracking — eso es lo
 * que mejor entra a bandeja de entrada en correos 1:1). Línea en blanco =
 * nuevo párrafo; saltos simples = <br>.
 */
function textToHtml(text: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${htmlEscape(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${paras}</div>`;
}

/**
 * Envía un correo desde la cuenta del usuario (scope gmail.send) como
 * multipart/alternative (texto + HTML), con el nombre del DJ como remitente.
 * Gmail firma el mensaje con DKIM de la cuenta autenticada; la copia queda en
 * la carpeta "Enviados" del propio Gmail del usuario.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  bodyText: string;
  fromName?: string | null;
}): Promise<{ id: string; threadId: string }> {
  const token = await getGmailToken();
  if (!token) throw new Error("Gmail no conectado");

  const from = args.fromName
    ? `${encodeHeaderWord(args.fromName)} <${token.googleEmail}>`
    : token.googleEmail;

  const boundary = `=_drop_${randomUUID()}`;
  const mime = [
    `From: ${from}`,
    `To: ${args.to}`,
    `Subject: ${encodeHeaderWord(args.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64Body(args.bodyText),
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    b64Body(textToHtml(args.bodyText)),
    "",
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const res = await fetch(`${GMAIL_API_BASE}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(mime) }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gmail API ${res.status}: ${txt}`);
  }
  return (await res.json()) as { id: string; threadId: string };
}
