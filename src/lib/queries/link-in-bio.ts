import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/queries/dj-profile";

/**
 * Link-in-bio (Fase 4): links de la página pública tipo Linktree del DJ.
 * Tabla `link_in_bio_links` (migración 0067). Todas las lecturas son
 * RESILIENTES: si la tabla aún no existe (migración no corrida), devuelven
 * vacío en vez de lanzar, para que editor/página pública no crasheen.
 */

export interface LibLink {
  id: string;
  label: string;
  url: string;
  position: number;
  active: boolean;
}

const COLS = "id, label, url, position, active";

/** Todos los links del DJ logueado (activos e inactivos), para el editor. */
export async function listMyLinks(): Promise<LibLink[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("link_in_bio_links")
    .select(COLS)
    .eq("user_id", user.id)
    .order("position", { ascending: true });
  if (error) return []; // tabla ausente / error → resiliente
  return (data ?? []) as LibLink[];
}

/** Links ACTIVOS de un DJ (por user_id) para la página pública /l/{slug}. */
export async function getPublicLinks(userId: string): Promise<LibLink[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("link_in_bio_links")
    .select(COLS)
    .eq("user_id", userId)
    .eq("active", true)
    .order("position", { ascending: true });
  if (error) return [];
  return (data ?? []) as LibLink[];
}

/**
 * Si el DJ no tiene links, pre-crea desde las redes de su perfil (auto-seed).
 * Idempotente: no hace nada si ya hay links o si la tabla no existe.
 */
export async function seedFromProfileIfEmpty(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing, error } = await supabase
    .from("link_in_bio_links")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);
  if (error) return; // tabla ausente → no seed
  if (existing && existing.length > 0) return;

  const profile = await getMyProfile();
  if (!profile) return;

  const candidates: Array<{ label: string; url: string }> = [];
  const add = (label: string, url: string | null | undefined) => {
    if (url && url.trim()) candidates.push({ label, url: url.trim() });
  };
  add("Spotify", profile.spotify_url);
  add("SoundCloud", profile.soundcloud_url);
  add("YouTube", profile.youtube_url);
  add("Beatport", profile.beatport_url);
  add("Bandcamp", profile.bandcamp_url);
  add("Instagram", profile.instagram_url);
  add("Sitio web", profile.website);
  if (candidates.length === 0) return;

  const rows = candidates.map((c, i) => ({
    user_id: user.id,
    label: c.label,
    url: c.url,
    position: i,
    active: true,
  }));
  await supabase.from("link_in_bio_links").insert(rows);
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function addLink(label: string, url: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { data: last } = await supabase
    .from("link_in_bio_links")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);
  const pos = ((last?.[0]?.position as number | undefined) ?? -1) + 1;
  const { error } = await supabase.from("link_in_bio_links").insert({
    user_id: user.id,
    label: label.trim().slice(0, 80),
    url: url.trim().slice(0, 500),
    position: pos,
    active: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateLink(
  id: string,
  label: string,
  url: string
): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("link_in_bio_links")
    .update({ label: label.trim().slice(0, 80), url: url.trim().slice(0, 500) })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function deleteLink(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("link_in_bio_links")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function setActive(id: string, active: boolean): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("link_in_bio_links")
    .update({ active })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

/** Reordena moviendo un link una posición arriba/abajo (swap con el vecino). */
export async function moveLink(
  id: string,
  dir: "up" | "down"
): Promise<void> {
  const { supabase, user } = await requireUser();
  const links = await listMyLinks();
  const idx = links.findIndex((l) => l.id === id);
  if (idx < 0) return;
  const swapIdx = dir === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= links.length) return;

  const a = links[idx];
  const b = links[swapIdx];
  // Intercambia sus `position`.
  const { error: e1 } = await supabase
    .from("link_in_bio_links")
    .update({ position: b.position })
    .eq("id", a.id)
    .eq("user_id", user.id);
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase
    .from("link_in_bio_links")
    .update({ position: a.position })
    .eq("id", b.id)
    .eq("user_id", user.id);
  if (e2) throw new Error(e2.message);
}
