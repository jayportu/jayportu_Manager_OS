/**
 * Cliente Google Calendar API (server-side).
 * Reusa el access_token de gmail_connections (mismo OAuth, scopes ampliados).
 */
import "server-only";
import { getGmailToken } from "@/lib/gmail/client";

const CAL_API_BASE = "https://www.googleapis.com/calendar/v3";

async function calFetch<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getGmailToken();
  if (!token) throw new Error("Google no conectado");
  const res = await fetch(`${CAL_API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token.accessToken}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    // Si es 403 con "insufficient scope" → el user necesita reconectar
    if (res.status === 403 && /scope|insufficient/i.test(txt)) {
      throw new Error(
        "Falta permiso de Calendar. Reconecta tu cuenta de Google desde Configuración."
      );
    }
    throw new Error(`Calendar API ${res.status}: ${txt}`);
  }
  return (await res.json()) as T;
}

// ─── Types Google Calendar Event ──────────────────────────────────────
export interface GCalEvent {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  htmlLink?: string;
  status?: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}

// ─── Operaciones ──────────────────────────────────────────────────────

/** Lista eventos en un rango de fechas (default: próximos 60 días) */
export async function listGCalEvents(opts?: {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  calendarId?: string;
}): Promise<GCalEvent[]> {
  const calendarId = opts?.calendarId || "primary";
  const now = new Date();
  const sixtyDaysFromNow = new Date(
    now.getTime() + 60 * 24 * 60 * 60 * 1000
  );
  const params = new URLSearchParams({
    timeMin: opts?.timeMin || now.toISOString(),
    timeMax: opts?.timeMax || sixtyDaysFromNow.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(opts?.maxResults ?? 50),
  });

  const json = await calFetch<{ items?: GCalEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`
  );
  return json.items || [];
}

export async function createGCalEvent(args: {
  title: string;
  description?: string;
  location?: string;
  startISO: string;
  endISO: string;
  timeZone?: string;
  calendarId?: string;
}): Promise<GCalEvent> {
  const calendarId = args.calendarId || "primary";
  const body: GCalEvent = {
    summary: args.title,
    description: args.description || "",
    location: args.location || "",
    start: {
      dateTime: args.startISO,
      timeZone: args.timeZone || "America/Santiago",
    },
    end: {
      dateTime: args.endISO,
      timeZone: args.timeZone || "America/Santiago",
    },
  };

  return calFetch<GCalEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function updateGCalEvent(
  googleEventId: string,
  patch: Partial<{
    title: string;
    description: string;
    location: string;
    startISO: string;
    endISO: string;
  }>,
  calendarId = "primary"
): Promise<GCalEvent> {
  const body: Partial<GCalEvent> = {};
  if (patch.title !== undefined) body.summary = patch.title;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.location !== undefined) body.location = patch.location;
  if (patch.startISO)
    body.start = { dateTime: patch.startISO, timeZone: "America/Santiago" };
  if (patch.endISO)
    body.end = { dateTime: patch.endISO, timeZone: "America/Santiago" };

  return calFetch<GCalEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
      googleEventId
    )}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export async function deleteGCalEvent(
  googleEventId: string,
  calendarId = "primary"
): Promise<void> {
  await calFetch<void>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(
      googleEventId
    )}`,
    { method: "DELETE" }
  );
}
