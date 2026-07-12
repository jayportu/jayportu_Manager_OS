/**
 * GET /api/export
 *
 * Backup completo del usuario autenticado en formato JSON.
 * Incluye todas las tablas del schema actual — lado DJ y lado booker
 * (acceso del titular · Ley 21.719 / GDPR).
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

  // Filtro OR para tablas donde el usuario puede ser el DJ o el booker.
  const djOrBooker = `dj_user_id.eq.${user.id},booker_user_id.eq.${user.id}`;

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
    { data: growth_campaigns },
    { data: content_posts },
    { data: platform_snapshots },
    { data: platform_accounts },
    // ── Lado booker + convocatorias (acceso del titular) ──
    { data: booker_account },
    { data: booker_favorites },
    { data: open_gigs },
    { data: gig_applications },
    { data: venue_pitches },
    { data: venue_interest },
  ] = await Promise.all([
    supabase.from("dj_profile").select("*").eq("user_id", user.id).maybeSingle(),
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
    supabase.from("growth_campaigns").select("*").eq("user_id", user.id),
    supabase.from("content_posts").select("*").eq("user_id", user.id),
    supabase.from("platform_snapshots").select("*").eq("user_id", user.id),
    supabase.from("platform_accounts").select("*").eq("user_id", user.id),
    // Lado booker: cuenta propia + favoritos + convocatorias publicadas +
    // postulaciones enviadas (como DJ) + pitches / intereses (como DJ o booker).
    supabase.from("booker_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("booker_favorites").select("*").eq("user_id", user.id),
    supabase.from("open_gigs").select("*").eq("booker_user_id", user.id),
    supabase.from("gig_applications").select("*").eq("dj_user_id", user.id),
    supabase.from("venue_pitches").select("*").or(djOrBooker),
    supabase.from("venue_interest").select("*").or(djOrBooker),
  ]);

  const payload = {
    meta: {
      app: "DROP",
      version: "0.13.0",
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
    growth_campaigns: growth_campaigns || [],
    content_posts: content_posts || [],
    platform_snapshots: platform_snapshots || [],
    platform_accounts: platform_accounts || [],
    booker_account,
    booker_favorites: booker_favorites || [],
    open_gigs: open_gigs || [],
    gig_applications: gig_applications || [],
    venue_pitches: venue_pitches || [],
    venue_interest: venue_interest || [],
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
      growth_campaigns: growth_campaigns?.length ?? 0,
      content_posts: content_posts?.length ?? 0,
      platform_snapshots: platform_snapshots?.length ?? 0,
      platform_accounts: platform_accounts?.length ?? 0,
      booker_favorites: booker_favorites?.length ?? 0,
      open_gigs: open_gigs?.length ?? 0,
      gig_applications: gig_applications?.length ?? 0,
      venue_pitches: venue_pitches?.length ?? 0,
      venue_interest: venue_interest?.length ?? 0,
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
