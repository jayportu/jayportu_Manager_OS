/**
 * Cliente Gmail API (server-side).
 * Maneja el refresh automático del access_token cuando expira.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { refreshAccessToken } from "./oauth";
import type { GmailConnection } from "@/types/database";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

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
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
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
    await supabase
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
  const { supabase, user } = await getUserOrThrow();
  await supabase.from("gmail_connections").delete().eq("user_id", user.id);
}

// ─── Gmail API wrappers ───────────────────────────────────────────────

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

export interface GmailThreadSummary {
  id: string;
  historyId: string;
  snippet: string;
}

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string; size?: number };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
      parts?: Array<unknown>;
    }>;
  };
  internalDate?: string;
}

export interface GmailThread {
  id: string;
  historyId: string;
  messages?: GmailMessage[];
}

/** Lista hilos. Filter opcional: query gmail (ej: "from:foo@bar.com") */
export async function listThreads(opts?: {
  q?: string;
  maxResults?: number;
}): Promise<GmailThreadSummary[]> {
  const params = new URLSearchParams();
  if (opts?.q) params.set("q", opts.q);
  params.set("maxResults", String(opts?.maxResults ?? 20));
  const json = await gmailFetch<{ threads?: GmailThreadSummary[] }>(
    `/threads?${params.toString()}`
  );
  return json.threads || [];
}

export async function getThread(threadId: string): Promise<GmailThread> {
  return gmailFetch<GmailThread>(`/threads/${threadId}?format=metadata`);
}

/**
 * Trae metadata (Subject/From/Date) de varios hilos en UNA sola llamada HTTP
 * vía el batch endpoint de Gmail, en vez de N getThread en paralelo (N+1).
 *
 * Devuelve un Map threadId → GmailThread. El mapeo es por el `id` que vuelve
 * en cada respuesta, así que NO depende del orden del batch. Si el batch
 * entero falla, loguea y devuelve lo que haya podido parsear (puede ser vacío)
 * para degradar a "solo snippet" sin romper la página.
 */
const BATCH_META_HEADERS = ["Subject", "From", "Date"];

export async function getThreadsMetadataBatch(
  threadIds: string[]
): Promise<Map<string, GmailThread>> {
  const result = new Map<string, GmailThread>();
  if (threadIds.length === 0) return result;

  const token = await getGmailToken();
  if (!token) throw new Error("Gmail no conectado");

  const boundary = "batch_drop_gmail_meta";
  const metaQuery = BATCH_META_HEADERS.map(
    (h) => `metadataHeaders=${h}`
  ).join("&");

  let body = "";
  threadIds.forEach((id, i) => {
    body += `--${boundary}\r\n`;
    body += "Content-Type: application/http\r\n";
    body += `Content-ID: <item-${i}>\r\n\r\n`;
    body += `GET /gmail/v1/users/me/threads/${id}?format=metadata&${metaQuery}\r\n\r\n`;
  });
  body += `--${boundary}--\r\n`;

  try {
    const res = await fetch("https://gmail.googleapis.com/batch/gmail/v1", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": `multipart/mixed; boundary=${boundary}`,
      },
      body,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Gmail batch ${res.status}: ${txt}`);
    }
    const text = await res.text();

    // El boundary de la respuesta lo genera Google (distinto al del request).
    const ct = res.headers.get("content-type") || "";
    const bm = ct.match(/boundary=([^;]+)/);
    const respBoundary = bm ? bm[1].trim().replace(/^"|"$/g, "") : null;
    const chunks = respBoundary ? text.split(`--${respBoundary}`) : [text];

    for (const chunk of chunks) {
      // Cada parte = una respuesta HTTP con un único objeto JSON.
      const start = chunk.indexOf("{");
      const end = chunk.lastIndexOf("}");
      if (start === -1 || end <= start) continue;
      try {
        const json = JSON.parse(chunk.slice(start, end + 1)) as GmailThread & {
          error?: unknown;
        };
        if (json && typeof json.id === "string" && !json.error) {
          result.set(json.id, json);
        }
      } catch {
        // parte sin JSON válido (preámbulo/epílogo del multipart) — ignorar
      }
    }
  } catch (e) {
    console.error("getThreadsMetadataBatch error:", e);
  }

  return result;
}

export async function getThreadFull(threadId: string): Promise<GmailThread> {
  return gmailFetch<GmailThread>(`/threads/${threadId}?format=full`);
}

/** Helper: extrae headers principales de un mensaje */
export function extractMessageMeta(msg: GmailMessage): {
  subject: string;
  from: string;
  to: string;
  date: string;
} {
  const headers = msg.payload?.headers || [];
  const find = (n: string) =>
    headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
  return {
    subject: find("Subject"),
    from: find("From"),
    to: find("To"),
    date: find("Date") || msg.internalDate || "",
  };
}

/** Helper: extrae body texto plano */
export function extractBodyText(msg: GmailMessage): string {
  function decode(b64?: string): string {
    if (!b64) return "";
    // Gmail usa base64url
    const norm = b64.replace(/-/g, "+").replace(/_/g, "/");
    try {
      return Buffer.from(norm, "base64").toString("utf-8");
    } catch {
      return "";
    }
  }
  if (msg.payload?.body?.data) return decode(msg.payload.body.data);
  // Multipart
  const stack = [...(msg.payload?.parts || [])];
  while (stack.length > 0) {
    const p = stack.shift() as {
      mimeType: string;
      body?: { data?: string };
      parts?: Array<unknown>;
    };
    if (p.mimeType === "text/plain" && p.body?.data) return decode(p.body.data);
    if (p.parts) {
      for (const sub of p.parts) stack.push(sub as typeof p);
    }
  }
  // Fallback: HTML→texto crudo
  const stack2 = [...(msg.payload?.parts || [])];
  while (stack2.length > 0) {
    const p = stack2.shift() as {
      mimeType: string;
      body?: { data?: string };
    };
    if (p.mimeType === "text/html" && p.body?.data) {
      return decode(p.body.data).replace(/<[^>]+>/g, "");
    }
  }
  return msg.snippet || "";
}

/**
 * Crea un borrador (no envía).
 * Body es un MIME message en base64url.
 */
export async function createDraft(args: {
  to: string;
  subject: string;
  bodyText: string;
  replyToThreadId?: string;
}): Promise<{ id: string; message: { id: string; threadId: string } }> {
  const mime = buildMimeMessage(args);
  const raw = Buffer.from(mime, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const payload: Record<string, unknown> = {
    message: { raw },
  };
  if (args.replyToThreadId) {
    (payload.message as Record<string, unknown>).threadId =
      args.replyToThreadId;
  }
  return gmailFetch<{ id: string; message: { id: string; threadId: string } }>(
    "/drafts",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

function buildMimeMessage(args: {
  to: string;
  subject: string;
  bodyText: string;
}): string {
  const lines = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    args.bodyText,
  ];
  return lines.join("\r\n");
}
