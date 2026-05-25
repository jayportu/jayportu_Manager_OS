/**
 * Sprint 21 — Endpoint que genera la imagen IG story 1080×1920 con los
 * highlight tracks del set.
 *
 * Usa next/og (ImageResponse) para renderizar JSX a PNG en el edge.
 * Solo el owner de la tracklist puede generarla (auth check via supabase).
 *
 * Layout:
 *   - Hero: artist name + venue/fecha
 *   - 5 tracks highlight (selectHighlightTracks: intro + peak + closer + 2 random)
 *   - Footer DROP. + presskit slug
 */

import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import {
  getTracklist,
  listTracksForTracklist,
  selectHighlightTracks,
} from "@/lib/queries/tracklists";
import { getMyProfile } from "@/lib/queries/dj-profile";

export const runtime = "edge";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("No autenticado", { status: 401 });
  }

  const tracklist = await getTracklist(id);
  if (!tracklist) {
    return new Response("Tracklist no encontrada", { status: 404 });
  }
  const profile = await getMyProfile();
  if (!profile) {
    return new Response("Perfil no encontrado", { status: 404 });
  }

  const allTracks = await listTracksForTracklist(id);
  const highlights = selectHighlightTracks(allTracks);

  // Datos del evento (si la tracklist está vinculada)
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
      eventVenue = e.location || "";
      eventDate = new Date(e.start_at).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "America/Santiago",
      });
    }
  }

  const totalTracks = tracklist.total_tracks || allTracks.length;
  const bpmAvg = tracklist.bpm_avg;
  const duration = tracklist.duration_minutes;
  const durationLabel =
    duration !== null && duration !== undefined
      ? `~${Math.floor(duration / 60)
          .toString()
          .padStart(2, "0")}:${(duration % 60).toString().padStart(2, "0")}h`
      : "";

  // Paleta Type Beat
  const CREAM = "#F4EFE7";
  const INK = "#0A0A0A";
  const ORANGE = "#FF5C00";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: CREAM,
          color: INK,
          padding: 64,
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 4,
              color: ORANGE,
              textTransform: "uppercase",
            }}
          >
            — TRACKLIST
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 22,
              fontWeight: 700,
              color: INK,
            }}
          >
            DROP<span style={{ color: ORANGE }}>.</span>
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 60,
            paddingBottom: 30,
            borderBottom: `4px solid ${INK}`,
          }}
        >
          <div
            style={{
              fontSize: 100,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -2,
              color: INK,
              textTransform: "uppercase",
            }}
          >
            {truncate(profile.artist_name || "DJ", 16)}
            <span style={{ color: ORANGE }}>.</span>
          </div>
          {eventVenue && (
            <div
              style={{
                fontSize: 36,
                marginTop: 16,
                color: INK,
                opacity: 0.8,
              }}
            >
              @ {truncate(eventVenue, 28)}
            </div>
          )}
          {eventDate && (
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 26,
                marginTop: 12,
                letterSpacing: 3,
                color: INK,
                opacity: 0.6,
                textTransform: "uppercase",
              }}
            >
              {eventDate}
            </div>
          )}
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            marginTop: 24,
            gap: 20,
          }}
        >
          <StatBlock label="TRACKS" value={String(totalTracks).padStart(2, "0")} fg={ORANGE} ink={INK} />
          <StatBlock
            label="BPM AVG"
            value={bpmAvg !== null && bpmAvg !== undefined ? String(bpmAvg) : "—"}
            fg={CREAM}
            ink={INK}
            bg={INK}
          />
          <StatBlock
            label="DURATION"
            value={durationLabel || "—"}
            fg={INK}
            ink={INK}
          />
        </div>

        {/* Tracks */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            flex: 1,
          }}
        >
          {highlights.slice(0, 5).map((t) => {
            const tagLabel = t.tag ? t.tag.toUpperCase() : "";
            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "20px 0",
                  borderBottom: `2px solid ${INK}33`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 24,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 36,
                      fontWeight: 700,
                      color: ORANGE,
                      width: 60,
                    }}
                  >
                    {String(t.sort_order).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 700,
                        color: INK,
                        lineHeight: 1.2,
                      }}
                    >
                      {truncate(t.artist || "—", 30)}
                    </div>
                    <div
                      style={{
                        fontSize: 28,
                        color: INK,
                        opacity: 0.7,
                        lineHeight: 1.2,
                        marginTop: 4,
                      }}
                    >
                      {truncate(t.title || "—", 32)}
                    </div>
                  </div>
                  {tagLabel && (
                    <div
                      style={{
                        fontFamily: "monospace",
                        fontSize: 18,
                        fontWeight: 700,
                        padding: "6px 14px",
                        backgroundColor: ORANGE,
                        color: INK,
                        letterSpacing: 2,
                      }}
                    >
                      {tagLabel}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {highlights.length === 0 && (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                color: INK,
                opacity: 0.5,
                fontStyle: "italic",
              }}
            >
              Aún sin tracks
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 30,
            paddingTop: 30,
            borderTop: `4px solid ${INK}`,
          }}
        >
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 20,
              letterSpacing: 3,
              color: INK,
              opacity: 0.7,
              textTransform: "uppercase",
            }}
          >
            drop.dj/p/{profile.public_slug || "—"}
          </div>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 20,
              fontWeight: 700,
              padding: "10px 18px",
              backgroundColor: INK,
              color: ORANGE,
              letterSpacing: 3,
            }}
          >
            POWERED BY DROP.
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
      headers: {
        "Content-Disposition": `inline; filename="tracklist-${id.slice(0, 8)}-story.png"`,
        "Cache-Control": "private, no-store",
      },
    }
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function StatBlock({
  label,
  value,
  fg,
  ink,
  bg,
}: {
  label: string;
  value: string;
  fg: string;
  ink: string;
  bg?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px 20px",
        border: `3px solid ${ink}`,
        backgroundColor: bg || "transparent",
        minWidth: 200,
      }}
    >
      <div
        style={{
          fontFamily: "monospace",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: 2,
          color: fg,
          textTransform: "uppercase",
          opacity: 0.9,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 900,
          color: fg,
          lineHeight: 1,
          marginTop: 8,
        }}
      >
        {value}
      </div>
    </div>
  );
}
