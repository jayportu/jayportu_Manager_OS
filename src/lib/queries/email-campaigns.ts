/**
 * Queries del dashboard ADMIN de campañas de correo (/admin/email-campaigns).
 * Mide la entregabilidad de los correos que DROP. manda vía Resend (ej. la
 * invitación beta). Distinto del feature CRM de campañas del DJ (campaigns.ts).
 *
 * Lee email_campaigns / email_sends / email_events con service_role (salta
 * RLS). Conteos acumulativos (entregado/abierto/click) desde email_events
 * (distinct por resend_id); envíos/programados desde email_sends.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EmailCampaign {
  id: string;
  slug: string;
  name: string;
  status: string;
  total_recipients: number;
  created_at: string;
}

interface SendRow {
  resend_id: string | null;
  to_email: string;
  to_name: string | null;
  scheduled_at: string | null;
  last_event: string;
}

interface EventRow {
  resend_id: string;
  event_type: string;
  occurred_at: string;
}

export interface Tanda {
  date: string; // YYYY-MM-DD
  total: number;
  done: boolean;
}

export interface FeedItem {
  event_type: string;
  to_email: string;
  occurred_at: string;
}

export interface CampaignDashboard {
  total: number;
  enviados: number;
  programados: number;
  delivered: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
  bounceRate: number; // % sobre enviados
  complaintRate: number;
  tandas: Tanda[];
  feed: FeedItem[];
}

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("email_campaigns")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as EmailCampaign[];
}

export async function getCampaignDashboard(
  campaignId: string
): Promise<CampaignDashboard> {
  const admin = createAdminClient();
  const [sendsRes, eventsRes] = await Promise.all([
    admin
      .from("email_sends")
      .select("resend_id,to_email,to_name,scheduled_at,last_event")
      .eq("campaign_id", campaignId),
    admin
      .from("email_events")
      .select("resend_id,event_type,occurred_at")
      .eq("campaign_id", campaignId)
      .order("occurred_at", { ascending: false })
      // Los KPIs (delivered/opened/clicked) cuentan distinct resend_id sobre
      // ESTAS filas. El cap de 3000 subcontaba la campaña grande (861 envíos ×
      // varias aperturas c/u supera 3000) → metrics truncadas. 50k queda muy
      // por sobre cualquier campaña real (scoped a un campaign_id).
      .limit(50000),
  ]);

  const sends = (sendsRes.data ?? []) as SendRow[];
  const events = (eventsRes.data ?? []) as EventRow[];

  const now = Date.now();
  const todayStr = new Date().toISOString().slice(0, 10);

  let enviados = 0;
  let programados = 0;
  const tandaMap = new Map<string, number>();
  for (const s of sends) {
    const future =
      s.scheduled_at != null && new Date(s.scheduled_at).getTime() > now;
    if (future) programados++;
    else enviados++;
    const date = s.scheduled_at ? s.scheduled_at.slice(0, 10) : todayStr;
    tandaMap.set(date, (tandaMap.get(date) ?? 0) + 1);
  }

  const distinct = (type: string) => {
    const set = new Set<string>();
    for (const e of events) if (e.event_type === type) set.add(e.resend_id);
    return set.size;
  };
  const delivered = distinct("delivered");
  const bounced = distinct("bounced");
  const complained = distinct("complained");
  const opened = distinct("opened");
  const clicked = distinct("clicked");

  const tandas: Tanda[] = Array.from(tandaMap.entries())
    .map(([date, total]) => ({ date, total, done: date <= todayStr }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const emailByRid = new Map<string, string>();
  for (const s of sends) if (s.resend_id) emailByRid.set(s.resend_id, s.to_email);
  const feed: FeedItem[] = events.slice(0, 15).map((e) => ({
    event_type: e.event_type,
    to_email: emailByRid.get(e.resend_id) ?? e.resend_id,
    occurred_at: e.occurred_at,
  }));

  const base = enviados || 1;
  return {
    total: sends.length,
    enviados,
    programados,
    delivered,
    bounced,
    complained,
    opened,
    clicked,
    bounceRate: (bounced / base) * 100,
    complaintRate: (complained / base) * 100,
    tandas,
    feed,
  };
}
