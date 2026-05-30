/**
 * Sprint 21 — Endpoint que dispara el webhook auto-post al guardar tracklist.
 *
 * Llamado desde el editor cuando el DJ presiona "Enviar al webhook".
 * Construye el payload JSON con tracklist + tracks + texto SoundCloud
 * formateado y hace POST al webhook configurado en dj_profile.
 *
 * Solo el owner puede disparar (auth check). Si no hay webhook configurado
 * o auto_post_enabled=false, retorna 400 con error claro.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getTracklist,
  listTracksForTracklist,
  formatSoundCloudDescription,
} from "@/lib/queries/tracklists";
import { getMyProfile } from "@/lib/queries/dj-profile";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "No autenticado" }, { status: 401 });
  }

  const profile = await getMyProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Perfil no encontrado" },
      { status: 404 }
    );
  }
  if (!profile.auto_post_enabled) {
    return NextResponse.json(
      {
        ok: false,
        error: "Auto-post desactivado. Actívalo en /configuracion.",
      },
      { status: 400 }
    );
  }
  if (!profile.auto_post_webhook_url) {
    return NextResponse.json(
      {
        ok: false,
        error: "No hay URL de webhook configurada en /configuracion.",
      },
      { status: 400 }
    );
  }

  const tracklist = await getTracklist(id);
  if (!tracklist) {
    return NextResponse.json(
      { ok: false, error: "Tracklist no encontrada" },
      { status: 404 }
    );
  }
  const tracks = await listTracksForTracklist(id);

  // Datos del evento vinculado
  let eventTitle = tracklist.title || "Set";
  let eventDate = "";
  let eventVenue = "";
  if (tracklist.calendar_event_id) {
    const { data: ev } = await supabase
      .from("calendar_events")
      .select("title, location, start_at")
      .eq("user_id", user.id)
      .eq("id", tracklist.calendar_event_id)
      .single();
    if (ev) {
      const e = ev as { title: string; location: string; start_at: string };
      eventTitle = e.title || eventTitle;
      eventVenue = e.location || "";
      eventDate = e.start_at;
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://dropgigs.com";

  const soundcloudText = formatSoundCloudDescription({
    tracklist,
    tracks,
    djName: profile.artist_name || "DJ",
    venueName: eventVenue,
    eventDate,
    presskitUrl: profile.public_slug
      ? `${siteUrl}/p/${profile.public_slug}`
      : undefined,
  });

  const payload = {
    event: "tracklist.saved",
    sent_at: new Date().toISOString(),
    dj: {
      user_id: user.id,
      artist_name: profile.artist_name,
      city: profile.city,
      slug: profile.public_slug,
    },
    tracklist: {
      id: tracklist.id,
      title: eventTitle,
      venue: eventVenue,
      event_date: eventDate ? eventDate.slice(0, 10) : null,
      total_tracks: tracklist.total_tracks,
      bpm_avg: tracklist.bpm_avg,
      duration_minutes: tracklist.duration_minutes,
    },
    tracks: tracks.map((t) => ({
      n: t.sort_order,
      artist: t.artist,
      title: t.title,
      label: t.label,
      bpm: t.bpm,
      music_key: t.music_key,
      tag: t.tag,
      played_at: t.played_at,
    })),
    soundcloud_text: soundcloudText,
    presskit_url: profile.public_slug ? `${siteUrl}/p/${profile.public_slug}` : null,
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(profile.auto_post_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      tracks_sent: tracks.length,
    });
  } catch (e) {
    const error = e instanceof Error ? e.message : "Error de red";
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
