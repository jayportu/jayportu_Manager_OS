import "server-only";

/**
 * F1/n8n — Concierge de matching. Dado un open_gig, devuelve los DJs que calzan
 * (activos, misma ciudad; los que además matchean género van primero) para que
 * n8n avise al equipo o contacte a los DJs top y así cada convocatoria reciba
 * postulantes rápido (ataca el cold-start).
 *
 * Se lee con service_role (createAdminClient). Devuelve contacto (email/whatsapp)
 * porque el consumidor es un endpoint server-to-server protegido por secreto
 * (BOOKER_N8N_SECRET), no el cliente. No exponer esta data al browser.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface MatchCandidate {
  user_id: string;
  artist_name: string;
  public_slug: string;
  city: string;
  genres: string[];
  public_email: string;
  whatsapp: string;
  genre_match: boolean;
}

export interface MatchResult {
  gig: { id: string; title: string; city: string; genre: string } | null;
  candidates: MatchCandidate[];
}

interface DjRow {
  user_id: string;
  artist_name: string | null;
  public_slug: string | null;
  city: string | null;
  genres: string[] | null;
  public_email: string | null;
  whatsapp: string | null;
}

export async function matchDjsForGig(
  gigId: string,
  limit = 50
): Promise<MatchResult> {
  const admin = createAdminClient();

  const { data: gig } = await admin
    .from("open_gigs")
    .select("id, title, city, genre")
    .eq("id", gigId)
    .maybeSingle();
  if (!gig) return { gig: null, candidates: [] };
  const g = gig as { id: string; title: string; city: string; genre: string };

  let q = admin
    .from("dj_profile")
    .select("user_id, artist_name, public_slug, city, genres, public_email, whatsapp")
    .eq("account_status", "active")
    .not("public_slug", "is", null)
    .neq("public_slug", "");
  if (g.city && g.city.trim()) q = q.ilike("city", `%${g.city.trim()}%`);
  const { data: djs } = await q.limit(limit);

  const genre = (g.genre || "").trim().toLowerCase();
  const rows = (djs ?? []) as DjRow[];
  const candidates: MatchCandidate[] = rows.map((d) => {
    const genres = Array.isArray(d.genres) ? d.genres : [];
    const genre_match =
      !!genre && genres.some((x) => (x || "").toLowerCase().includes(genre));
    return {
      user_id: d.user_id,
      artist_name: d.artist_name || "",
      public_slug: d.public_slug || "",
      city: d.city || "",
      genres,
      public_email: d.public_email || "",
      whatsapp: d.whatsapp || "",
      genre_match,
    };
  });
  // Los que matchean género primero (orden estable por lo demás).
  candidates.sort((a, b) => Number(b.genre_match) - Number(a.genre_match));

  return {
    gig: { id: g.id, title: g.title, city: g.city, genre: g.genre },
    candidates,
  };
}
