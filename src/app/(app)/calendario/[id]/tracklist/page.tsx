/**
 * Sprint 21 — Editor de tracklist post-show.
 *
 * Ruta: /calendario/[id]/tracklist donde [id] es el calendar_event_id.
 * Se crea (o levanta) la tracklist asociada al evento y permite editar
 * tracks, ver KPIs en vivo y disparar acciones de export.
 */

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getOrCreateTracklistForEvent,
  listTracksForTracklist,
} from "@/lib/queries/tracklists";
import { getMyProfile } from "@/lib/queries/dj-profile";
import { TracklistEditor } from "./tracklist-editor";
import { ArrowLeft } from "lucide-react";
import type { CalendarEventRow } from "@/lib/calendar/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TracklistPage({ params }: PageProps) {
  const { id: calendarEventId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Cargamos el evento para mostrar título / fecha / venue como contexto
  const { data: eventData } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", calendarEventId)
    .single();
  if (!eventData) notFound();
  const event = eventData as CalendarEventRow;

  // Creamos (o levantamos) la tracklist asociada al evento
  const tracklist = await getOrCreateTracklistForEvent(
    calendarEventId,
    event.title || ""
  );
  const tracks = await listTracksForTracklist(tracklist.id);
  const profile = await getMyProfile();
  const autoPost = {
    enabled: !!profile?.auto_post_enabled,
    hasUrl: !!profile?.auto_post_webhook_url,
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <Link
        href="/calendario"
        className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-fg-muted hover:text-orange mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Volver al calendario
      </Link>

      <div className="border-2 border-ink bg-white p-6 mb-5">
        <div className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-orange">
          — TRACKLIST · POST-SHOW
        </div>
        <h1 className="font-display text-4xl md:text-5xl leading-none mt-2">
          {event.title || "Set"}<span className="text-orange">.</span>
        </h1>
        <p className="text-sm text-fg-muted mt-2">
          {new Date(event.start_at).toLocaleString("es-CL", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "America/Santiago",
          })}
          {event.location ? ` · ${event.location}` : ""}
        </p>
      </div>

      <TracklistEditor
        tracklistId={tracklist.id}
        calendarEventId={calendarEventId}
        initialTracklist={tracklist}
        initialTracks={tracks}
        autoPost={autoPost}
      />
    </div>
  );
}
