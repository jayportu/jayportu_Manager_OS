/**
 * Sprint 21 — Queries de tracklists + tracks.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  Tracklist,
  TracklistTrack,
  TracklistTrackInsert,
} from "@/types/database";

async function getUserOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listMyTracklists(
  limit = 100
): Promise<Tracklist[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tracklists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return data as Tracklist[];
}

export async function getTracklistByEventId(
  calendarEventId: string
): Promise<Tracklist | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tracklists")
    .select("*")
    .eq("user_id", user.id)
    .eq("calendar_event_id", calendarEventId)
    .maybeSingle();
  if (error || !data) return null;
  return data as Tracklist;
}

export async function getOrCreateTracklistForEvent(
  calendarEventId: string,
  defaultTitle = ""
): Promise<Tracklist> {
  const existing = await getTracklistByEventId(calendarEventId);
  if (existing) return existing;
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tracklists")
    .insert({
      user_id: user.id,
      calendar_event_id: calendarEventId,
      title: defaultTitle,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Tracklist;
}

export async function getTracklist(id: string): Promise<Tracklist | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tracklists")
    .select("*")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Tracklist;
}

export async function listTracksForTracklist(
  tracklistId: string
): Promise<TracklistTrack[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tracklist_tracks")
    .select("*")
    .eq("user_id", user.id)
    .eq("tracklist_id", tracklistId)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data as TracklistTrack[];
}

export async function addTrack(
  input: TracklistTrackInsert
): Promise<TracklistTrack> {
  const { supabase, user } = await getUserOrThrow();
  // sort_order auto: el siguiente
  let order = input.sort_order;
  if (order === undefined) {
    const { count } = await supabase
      .from("tracklist_tracks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("tracklist_id", input.tracklist_id);
    order = (count ?? 0) + 1;
  }
  const { data, error } = await supabase
    .from("tracklist_tracks")
    .insert({
      user_id: user.id,
      tracklist_id: input.tracklist_id,
      sort_order: order,
      artist: input.artist ?? "",
      title: input.title ?? "",
      label: input.label ?? "",
      bpm: input.bpm ?? null,
      music_key: input.music_key ?? "",
      tag: input.tag ?? null,
      played_at: input.played_at ?? null,
      notes: input.notes ?? "",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await recomputeTracklistKpis(input.tracklist_id);
  return data as TracklistTrack;
}

export async function updateTrack(
  id: string,
  patch: Partial<TracklistTrackInsert>
): Promise<TracklistTrack> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("tracklist_tracks")
    .update(patch)
    .eq("user_id", user.id)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await recomputeTracklistKpis((data as TracklistTrack).tracklist_id);
  return data as TracklistTrack;
}

export async function deleteTrack(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  // Recordar tracklist_id antes de borrar
  const { data: pre } = await supabase
    .from("tracklist_tracks")
    .select("tracklist_id")
    .eq("user_id", user.id)
    .eq("id", id)
    .single();
  const tlId = pre ? (pre as { tracklist_id: string }).tracklist_id : null;

  const { error } = await supabase
    .from("tracklist_tracks")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (tlId) await recomputeTracklistKpis(tlId);
}

/**
 * Recalcula KPIs de una tracklist al modificar/agregar/borrar tracks.
 * Calcula: total_tracks, bpm_avg, duration_minutes.
 */
export async function recomputeTracklistKpis(
  tracklistId: string
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { data } = await supabase
    .from("tracklist_tracks")
    .select("bpm")
    .eq("user_id", user.id)
    .eq("tracklist_id", tracklistId);
  const tracks = (data ?? []) as Array<{ bpm: number | null }>;
  const totalTracks = tracks.length;
  const bpmList = tracks.map((t) => t.bpm).filter((b): b is number => b !== null);
  const bpmAvg =
    bpmList.length > 0
      ? Math.round(
          (bpmList.reduce((s, b) => s + b, 0) / bpmList.length) * 10
        ) / 10
      : null;
  // Estimación duración: 1 track ~ 18 minutos (set average)
  const durationMinutes = totalTracks > 0 ? totalTracks * 18 : null;
  const { error } = await supabase
    .from("tracklists")
    .update({
      total_tracks: totalTracks,
      bpm_avg: bpmAvg,
      duration_minutes: durationMinutes,
    })
    .eq("user_id", user.id)
    .eq("id", tracklistId);
  if (error) console.error("[tracklists] recomputeTracklistKpis:", error.message);
}

export async function bulkInsertTracks(
  tracklistId: string,
  tracks: Omit<TracklistTrackInsert, "tracklist_id">[]
): Promise<{ inserted: number }> {
  const { supabase, user } = await getUserOrThrow();
  // Obtener el siguiente sort_order
  const { count } = await supabase
    .from("tracklist_tracks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("tracklist_id", tracklistId);
  const startOrder = (count ?? 0) + 1;
  const rows = tracks.map((t, i) => ({
    user_id: user.id,
    tracklist_id: tracklistId,
    sort_order: t.sort_order ?? startOrder + i,
    artist: t.artist ?? "",
    title: t.title ?? "",
    label: t.label ?? "",
    bpm: t.bpm ?? null,
    music_key: t.music_key ?? "",
    tag: t.tag ?? null,
    played_at: t.played_at ?? null,
    notes: t.notes ?? "",
  }));
  if (rows.length === 0) return { inserted: 0 };
  const { error } = await supabase.from("tracklist_tracks").insert(rows);
  if (error) throw new Error(error.message);
  await recomputeTracklistKpis(tracklistId);
  return { inserted: rows.length };
}

export async function deleteTracklist(id: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  const { error } = await supabase
    .from("tracklists")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Sprint 21 — Selecciona los tracks "highlight" para la imagen IG story.
 * Lógica: intro + peak (más reciente) + closer + hasta 2 random de los
 * middle. Total: máx 5.
 */
export function selectHighlightTracks(
  tracks: TracklistTrack[]
): TracklistTrack[] {
  const intro = tracks.find((t) => t.tag === "intro");
  const peak = tracks.findLast?.((t) => t.tag === "peak") ??
    tracks.slice().reverse().find((t) => t.tag === "peak");
  const closer = tracks.find((t) => t.tag === "closer");
  const used = new Set<string>(
    [intro?.id, peak?.id, closer?.id].filter((x): x is string => !!x)
  );
  const others = tracks.filter((t) => !used.has(t.id));
  const randomTwo = others
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(0, 5 - used.size));
  const result: TracklistTrack[] = [];
  if (intro) result.push(intro);
  result.push(...randomTwo);
  if (peak && !used.has(peak.id)) result.push(peak);
  if (closer) result.push(closer);
  // Reorder by sort_order para que se vea coherente
  return result.sort((a, b) => a.sort_order - b.sort_order);
}

/**
 * Genera el texto formateado de SoundCloud (paste-ready).
 */
export function formatSoundCloudDescription(input: {
  tracklist: Tracklist;
  tracks: TracklistTrack[];
  djName: string;
  venueName?: string;
  eventDate?: string;
  presskitUrl?: string;
}): string {
  const lines: string[] = [];
  const date = input.eventDate
    ? new Date(input.eventDate).toLocaleDateString("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        timeZone: "America/Santiago",
      })
    : "";
  const header = [
    `// ${input.djName}${input.venueName ? ` @ ${input.venueName}` : ""}${date ? ` · ${date}` : ""}`,
    `// ${input.tracklist.total_tracks} tracks${input.tracklist.bpm_avg ? ` · ${input.tracklist.bpm_avg} BPM avg` : ""}${input.tracklist.duration_minutes ? ` · ~${Math.floor(input.tracklist.duration_minutes / 60)}:${String(input.tracklist.duration_minutes % 60).padStart(2, "0")}h` : ""}`,
    "",
  ];
  lines.push(...header);
  for (const t of input.tracks) {
    const n = String(t.sort_order).padStart(2, "0");
    const artist = t.artist || "—";
    const title = t.title || "—";
    const label = t.label ? ` (${t.label})` : "";
    const tagLabel = t.tag ? ` [${t.tag.toUpperCase()}]` : "";
    lines.push(`${n}. ${artist} — ${title}${label}${tagLabel}`);
  }
  lines.push("");
  if (input.presskitUrl) {
    lines.push(`// recorded live · ${input.presskitUrl}`);
  }
  lines.push("// powered by dropgigs.com");
  return lines.join("\n");
}
