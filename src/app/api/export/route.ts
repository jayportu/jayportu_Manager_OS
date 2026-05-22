/**
 * GET /api/export
 *
 * Backup completo del usuario autenticado en formato JSON.
 * Incluye todas las tablas del schema actual.
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [
    { data: dj_profile },
    { data: contacts },
    { data: interactions },
    { data: follow_ups },
    { data: templates },
    { data: booking_form_submissions },
    { data: ai_outputs },
    { data: calendar_events },
    { data: discovered_leads },
    { data: campaigns },
    { data: campaign_contacts },
  ] = await Promise.all([
    supabase.from("dj_profile").select("*").eq("user_id", user.id).single(),
    supabase.from("contacts").select("*").eq("user_id", user.id),
    supabase.from("interactions").select("*").eq("user_id", user.id),
    supabase.from("follow_ups").select("*").eq("user_id", user.id),
    supabase.from("templates").select("*").eq("user_id", user.id),
    supabase.from("booking_form_submissions").select("*").eq("user_id", user.id),
    supabase.from("ai_outputs").select("*").eq("user_id", user.id),
    supabase.from("calendar_events").select("*").eq("user_id", user.id),
    supabase.from("discovered_leads").select("*").eq("user_id", user.id),
    supabase.from("campaigns").select("*").eq("user_id", user.id),
    supabase.from("campaign_contacts").select("*").eq("user_id", user.id),
  ]);

  const payload = {
    meta: {
      app: "JAY Manager OS",
      version: "0.9.0",
      sprint: 9,
      exported_at: new Date().toISOString(),
      user_email: user.email,
      user_id: user.id,
    },
    dj_profile,
    contacts: contacts || [],
    interactions: interactions || [],
    follow_ups: follow_ups || [],
    templates: templates || [],
    booking_form_submissions: booking_form_submissions || [],
    ai_outputs: ai_outputs || [],
    calendar_events: calendar_events || [],
    discovered_leads: discovered_leads || [],
    campaigns: campaigns || [],
    campaign_contacts: campaign_contacts || [],
    counts: {
      contacts: contacts?.length ?? 0,
      interactions: interactions?.length ?? 0,
      follow_ups: follow_ups?.length ?? 0,
      templates: templates?.length ?? 0,
      bookings: booking_form_submissions?.length ?? 0,
      ai_outputs: ai_outputs?.length ?? 0,
      calendar_events: calendar_events?.length ?? 0,
      discovered_leads: discovered_leads?.length ?? 0,
      campaigns: campaigns?.length ?? 0,
      campaign_contacts: campaign_contacts?.length ?? 0,
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
