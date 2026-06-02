/**
 * Bloque B — Queries del lado Booker.
 *
 * Diferencias clave vs queries del DJ:
 *   - El booker NO tiene RLS en booking_form_submissions para UPDATE
 *     (solo SELECT propio). El estado de los bookings lo controla el DJ.
 *   - El email match cubre el caso "booker se registra DESPUÉS de mandar
 *     bookings": linkeamos retroactivamente por email.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BookingSubmission } from "@/types/database";

export interface BookerAccount {
  user_id: string;
  full_name: string;
  email: string;
  booker_type: string;
  city: string;
  country: string;
  whatsapp: string;
  newsletter_optin: boolean;
  /** Migration 0032 — perfil de booker (fase 1) */
  website_url: string;
  instagram_url: string;
  bio: string;
  in_directory: boolean;
  accepts_pitches: boolean;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Lee el booker_account del user logueado (sin lazy-create). */
export async function getMyBookerAccount(): Promise<BookerAccount | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("booker_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return (data as BookerAccount) ?? null;
}

/**
 * Asegura que el user actual tenga un booker_account. Si no existe, lo crea
 * pobrando full_name/booker_type/city desde el user_metadata del signup.
 *
 * Retorna el booker_account. Si el user es un DJ (tiene dj_profile), retorna null.
 */
export async function ensureBookerAccount(): Promise<BookerAccount | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Si es DJ, no es booker
  const { data: dj } = await supabase
    .from("dj_profile")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (dj) return null;

  // ¿Ya tiene booker_account?
  const { data: existing } = await supabase
    .from("booker_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return existing as BookerAccount;

  // Crear desde user_metadata
  const meta = user.user_metadata || {};
  const { data: created, error } = await supabase
    .from("booker_accounts")
    .insert({
      user_id: user.id,
      full_name: typeof meta.full_name === "string" ? meta.full_name : "",
      email: user.email || "",
      booker_type:
        typeof meta.booker_type === "string" ? meta.booker_type : "otro",
      city: typeof meta.city === "string" ? meta.city : "",
    })
    .select("*")
    .single();

  if (error) {
    console.error("ensureBookerAccount insert error", error);
    return null;
  }
  return created as BookerAccount;
}

/**
 * Bookings del booker logueado.
 *
 * Match por DOS vías:
 *   1. booker_user_id = user.id (bookings mandados ya logueado)
 *   2. email = user.email (bookings antiguos mandados antes de tener cuenta)
 *
 * Se devuelven ordenados por fecha desc.
 */
export async function listMyBookerRequests(): Promise<BookingSubmission[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return [];

  // Query 1: por booker_user_id (RLS lo permite)
  const { data: byId, error: e1 } = await supabase
    .from("booking_form_submissions")
    .select("*")
    .eq("booker_user_id", user.id);
  if (e1) {
    console.error("listMyBookerRequests byId error", e1);
  }

  // Query 2: por email (RLS NO lo permite — necesitamos otra forma)
  // Solución: vamos a hacer match server-side via service role, pero
  // ESO permitiría a un user ver bookings con email de OTRO user.
  // Mitigación: solo aceptamos email match si email = user.email Y
  // booker_user_id IS NULL. Eso lo hacemos con una RPC o service_role
  // controlado. Por ahora MVP: solo byId, y backfill periódico que linkea
  // por email los huérfanos.
  // TODO post-MVP: RPC `claim_bookings_by_email` que setea booker_user_id
  // para todos los bookings con email = user.email AND booker_user_id IS NULL.

  return (byId ?? []) as BookingSubmission[];
}

/**
 * Backfill: linkea bookings huérfanos (booker_user_id IS NULL) al user
 * actual si el email coincide. Se llama en el layout del booker para que
 * los bookings hechos antes del signup queden visibles.
 *
 * Usa service_role (admin) porque RLS no permitiría este UPDATE.
 * Validamos que email coincide ANTES de hacer el update.
 */
export async function claimBookingsByEmail(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) return 0;

  // Usamos service_role via admin client porque RLS no deja al booker
  // hacer UPDATE de bookings (solo SELECT y solo de los suyos).
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("booking_form_submissions")
    .update({ booker_user_id: user.id })
    .eq("email", user.email.toLowerCase())
    .is("booker_user_id", null)
    .select("id");

  if (error) {
    console.error("claimBookingsByEmail error", error);
    return 0;
  }
  return data?.length ?? 0;
}

/**
 * Favoritos: lista de DJs que el booker ha guardado con corazón.
 * Incluye datos básicos del dj_profile para mostrar cards.
 */
export interface BookerFavorite {
  dj_user_id: string;
  artist_name: string;
  city: string;
  genres: string[];
  public_slug: string;
  hero_image_url: string;
  logo_url: string;
  favorited_at: string;
}

export async function listMyFavorites(): Promise<BookerFavorite[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("booker_favorites")
    .select(
      `
      dj_user_id,
      created_at,
      dj_profile:dj_profile!booker_favorites_dj_user_id_fkey(
        artist_name, city, genres, public_slug, hero_image_url, logo_url
      )
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listMyFavorites error", error);
    return [];
  }

  // Supabase devuelve dj_profile como array por defecto en relación FK
  type FavRow = {
    dj_user_id: string;
    created_at: string;
    dj_profile:
      | {
          artist_name: string;
          city: string;
          genres: string[];
          public_slug: string;
          hero_image_url: string;
          logo_url: string;
        }
      | Array<{
          artist_name: string;
          city: string;
          genres: string[];
          public_slug: string;
          hero_image_url: string;
          logo_url: string;
        }>
      | null;
  };

  return ((data ?? []) as FavRow[])
    .map((row) => {
      const dj = Array.isArray(row.dj_profile) ? row.dj_profile[0] : row.dj_profile;
      if (!dj) return null;
      return {
        dj_user_id: row.dj_user_id,
        artist_name: dj.artist_name,
        city: dj.city,
        genres: dj.genres ?? [],
        public_slug: dj.public_slug,
        hero_image_url: dj.hero_image_url,
        logo_url: dj.logo_url,
        favorited_at: row.created_at,
      } satisfies BookerFavorite;
    })
    .filter((x): x is BookerFavorite => x !== null);
}

/**
 * Checa si el user actual tiene un DJ específico en favoritos.
 * Útil para el botón corazón en /p/[slug] y /dj.
 */
export async function isFavorite(djUserId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("booker_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("dj_user_id", djUserId)
    .maybeSingle();
  return !!data;
}

// ════════════════════════════════════════════════════════════════════
// Sprint RA-3 — Feed de updates de los DJs seguidos
// ════════════════════════════════════════════════════════════════════

export interface FeedUpdate {
  event_id: string;
  dj_user_id: string;
  artist_name: string;
  public_slug: string;
  avatar_url: string;
  type: "show_scheduled" | "availability_updated";
  payload: Record<string, unknown>;
  created_at: string;
  /** true si el booker no había abierto su feed cuando este event fue creado. */
  unread: boolean;
  /** Si el booker tiene avisos por email activos sobre este DJ. */
  notify_email: boolean;
}

/**
 * Devuelve los updates recientes (últimos 30 días) de los DJs que el
 * booker tiene en booker_favorites. Determina "unread" comparando
 * created_at del event vs last_read_at del follow correspondiente.
 *
 * Solo lectura — no marca nada como leído. El marcado lo hace
 * markFollowFeedRead() (server action), llamado al renderizar la
 * página /booker/seguidos.
 */
export async function listFollowFeed(): Promise<FeedUpdate[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Trae los follows del booker (dj_user_id + last_read_at + notify_email)
  const { data: rawFollows, error: fErr } = await supabase
    .from("booker_favorites")
    .select("dj_user_id, last_read_at, notify_email")
    .eq("user_id", user.id);
  if (fErr || !rawFollows || rawFollows.length === 0) return [];
  type FollowRow = {
    dj_user_id: string;
    last_read_at: string | null;
    notify_email: boolean;
  };
  const follows = rawFollows as FollowRow[];
  const followByDj = new Map<string, FollowRow>(
    follows.map((f) => [f.dj_user_id, f])
  );

  // 2. Trae los events de esos DJs (últimos 30 días) via service_role
  //    porque dj_update_events tiene RLS de "solo own". Importamos
  //    createAdminClient dinámico para evitar ciclos.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const cutoffIso = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  const djIds = follows.map((f) => f.dj_user_id);
  const { data: rawEvents, error: evErr } = await admin
    .from("dj_update_events")
    .select("id, dj_user_id, type, payload, created_at")
    .in("dj_user_id", djIds)
    .gte("created_at", cutoffIso)
    .order("created_at", { ascending: false })
    .limit(50);
  if (evErr || !rawEvents) return [];
  type EventRow = {
    id: string;
    dj_user_id: string;
    type: "show_scheduled" | "availability_updated";
    payload: Record<string, unknown>;
    created_at: string;
  };
  const events = rawEvents as EventRow[];
  if (events.length === 0) return [];

  // 3. Trae perfiles de DJs
  const uniqueDjIds = Array.from(new Set(events.map((e) => e.dj_user_id)));
  const { data: rawProfiles } = await admin
    .from("dj_profile")
    .select("user_id, artist_name, public_slug, avatar_url")
    .in("user_id", uniqueDjIds);
  type ProfileRow = {
    user_id: string;
    artist_name: string;
    public_slug: string;
    avatar_url: string;
  };
  const profileByDj = new Map<string, ProfileRow>(
    ((rawProfiles ?? []) as ProfileRow[]).map((p) => [p.user_id, p])
  );

  // 4. Combinar
  return events
    .map((ev): FeedUpdate | null => {
      const dj = profileByDj.get(ev.dj_user_id);
      const follow = followByDj.get(ev.dj_user_id);
      if (!dj || !follow) return null;
      const unread = !follow.last_read_at
        ? true
        : new Date(ev.created_at) > new Date(follow.last_read_at);
      return {
        event_id: ev.id,
        dj_user_id: ev.dj_user_id,
        artist_name: dj.artist_name,
        public_slug: dj.public_slug,
        avatar_url: dj.avatar_url,
        type: ev.type,
        payload: ev.payload,
        created_at: ev.created_at,
        unread,
        notify_email: follow.notify_email,
      };
    })
    .filter((x): x is FeedUpdate => x !== null);
}

/**
 * Marca todos los follows del booker como leídos a `now()`. Llamado
 * desde la página /booker/seguidos en cada visita.
 */
export async function markFollowFeedRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("booker_favorites")
    .update({ last_read_at: new Date().toISOString() })
    .eq("user_id", user.id);
}
