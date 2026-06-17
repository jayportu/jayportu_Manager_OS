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
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshAccessToken } from "./oauth";
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
    return { accessToken: conn.access_token, googleEmail: conn.google_email };
  }

  // Refresh
  try {
    const fresh = await refreshAccessToken(conn.refresh_token);
    const newExpiresAt = new Date(
      Date.now() + fresh.expires_in * 1000
    ).toISOString();
    await admin
      .from("gmail_connections")
      .update({
        access_token: fresh.access_token,
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

export async function deleteGmailConnection(): Promise<void> {
  const { user } = await getUserOrThrow();
  const admin = createAdminClient();
  await admin.from("gmail_connections").delete().eq("user_id", user.id);
}

// ─── Gmail API: enviar ────────────────────────────────────────────────

async function gmailFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getGmailToken();
  if (!token) throw new Error("Gmail no conectado");
  const res = await fetch(`${GMAIL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token.accessToken}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Gmail API ${res.status}: ${txt}`);
  }
  return (await res.json()) as T;
}

/** Codifica un string a base64url (sin padding), como lo pide la Gmail API. */
function toBase64Url(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Envía un correo desde la cuenta del usuario (scope gmail.send).
 * El From lo pone Gmail automáticamente (la cuenta autenticada). La copia
 * queda en la carpeta "Enviados" del propio Gmail del usuario.
 */
export async function sendEmail(args: {
  to: string;
  subject: string;
  bodyText: string;
}): Promise<{ id: string; threadId: string }> {
  const raw = toBase64Url(buildMimeMessage(args));
  return gmailFetch<{ id: string; threadId: string }>("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  });
}

function buildMimeMessage(args: {
  to: string;
  subject: string;
  bodyText: string;
}): string {
  // Subject con tildes/ñ → encoded-word UTF-8 para no romper el header.
  const subject = /[^\x00-\x7F]/.test(args.subject)
    ? `=?UTF-8?B?${Buffer.from(args.subject, "utf-8").toString("base64")}?=`
    : args.subject;
  const lines = [
    `To: ${args.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    args.bodyText,
  ];
  return lines.join("\r\n");
}
