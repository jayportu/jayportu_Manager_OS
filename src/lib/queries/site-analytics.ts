import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Tráfico del sitio para /admin/trafico. Lee site_events (pageviews anónimos +
 * registrados) de la ventana y computa en memoria. Volumen beta = chico.
 */

export interface SiteTraffic {
  days: number;
  totalViews: number;
  sessions: number;
  registeredSessions: number;
  anonSessions: number;
  byDay: { day: string; views: number }[];
  topPaths: { path: string; views: number }[];
  topReferrers: { source: string; views: number }[];
  /** Estadía promedio en segundos (sesiones con +1 página). */
  avgDurationSec: number;
  multiPageSessions: number;
  /** Embudo de adquisición en la ventana. */
  funnel: { anonSessions: number; betaRequests: number; newAccounts: number };
  recent: { path: string; is_registered: boolean; created_at: string }[];
}

function santiagoDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "America/Santiago",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

function refSource(referrer: string | null): string {
  if (!referrer) return "directo";
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "");
    if (h.includes("instagram")) return "instagram";
    if (h.includes("whatsapp") || h === "l.wl.co") return "whatsapp";
    if (h.includes("google")) return "google";
    if (h.includes("dropgigs.com")) return "interno";
    return h;
  } catch {
    return "directo";
  }
}

export async function getSiteTraffic(days = 7): Promise<SiteTraffic> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();

  const { data, error } = await admin
    .from("site_events")
    .select("session_id, path, is_registered, referrer, created_at")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(20000);

  const rows = (error ? [] : data ?? []) as {
    session_id: string;
    path: string;
    is_registered: boolean;
    referrer: string | null;
    created_at: string;
  }[];

  // Sesiones: registrado si CUALQUIER evento de la sesión fue registrado.
  const sessionReg = new Map<string, boolean>();
  const sessionTimes = new Map<string, { min: number; max: number; n: number }>();
  const pathCount = new Map<string, number>();
  const refCount = new Map<string, number>();
  const dayCount = new Map<string, number>();

  for (const r of rows) {
    sessionReg.set(r.session_id, (sessionReg.get(r.session_id) || false) || r.is_registered);
    const t = new Date(r.created_at).getTime();
    const st = sessionTimes.get(r.session_id);
    if (st) {
      st.min = Math.min(st.min, t);
      st.max = Math.max(st.max, t);
      st.n += 1;
    } else {
      sessionTimes.set(r.session_id, { min: t, max: t, n: 1 });
    }
    pathCount.set(r.path, (pathCount.get(r.path) || 0) + 1);
    const src = refSource(r.referrer);
    refCount.set(src, (refCount.get(src) || 0) + 1);
    const d = santiagoDay(r.created_at);
    dayCount.set(d, (dayCount.get(d) || 0) + 1);
  }

  let regSessions = 0;
  for (const v of sessionReg.values()) if (v) regSessions++;

  // Estadía: promedio de (max-min) sobre sesiones con +1 página.
  let durSum = 0;
  let multi = 0;
  for (const st of sessionTimes.values()) {
    if (st.n > 1) {
      durSum += (st.max - st.min) / 1000;
      multi++;
    }
  }

  // Serie por día (rellena ceros, hora Chile, de hoy hacia atrás).
  const byDay: { day: string; views: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toLocaleDateString("en-CA", {
      timeZone: "America/Santiago",
    });
    byDay.push({ day: d, views: dayCount.get(d) || 0 });
  }

  const top = (m: Map<string, number>, n: number) =>
    Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n);

  // Embudo: cuentas + solicitudes beta creadas en la ventana.
  const [betaRes, djRes, bkRes] = await Promise.all([
    admin.from("beta_requests").select("id", { count: "exact", head: true }).gte("created_at", cutoff),
    admin.from("dj_profile").select("user_id", { count: "exact", head: true }).gte("created_at", cutoff),
    admin.from("booker_accounts").select("user_id", { count: "exact", head: true }).gte("created_at", cutoff),
  ]);
  const newAccounts = (djRes.count ?? 0) + (bkRes.count ?? 0);
  const anonSessions = sessionReg.size - regSessions;

  return {
    days,
    totalViews: rows.length,
    sessions: sessionReg.size,
    registeredSessions: regSessions,
    anonSessions,
    byDay,
    topPaths: top(pathCount, 8).map(([path, views]) => ({ path, views })),
    topReferrers: top(refCount, 6).map(([source, views]) => ({ source, views })),
    avgDurationSec: multi > 0 ? Math.round(durSum / multi) : 0,
    multiPageSessions: multi,
    funnel: { anonSessions, betaRequests: betaRes.count ?? 0, newAccounts },
    recent: rows.slice(0, 15).map((r) => ({
      path: r.path,
      is_registered: r.is_registered,
      created_at: r.created_at,
    })),
  };
}
