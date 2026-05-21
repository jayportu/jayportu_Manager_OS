/**
 * Types de las tablas en Supabase Postgres (manualmente sincronizados).
 *
 * Cuando crezca el schema podemos auto-generarlos con:
 *   npx supabase gen types typescript --project-id exryfdnptrhhwlfgqmpv > src/types/database.ts
 *
 * Por ahora a mano (más simple, sin instalar Supabase CLI).
 */

// ─── dj_profile ─────────────────────────────────────────────────────
export interface DjProfile {
  user_id: string;
  artist_name: string;
  tagline: string;
  bio_short: string;
  bio_long: string;
  genres: string[];
  city: string;
  country: string;
  instagram_url: string;
  soundcloud_url: string;
  youtube_url: string;
  spotify_url: string;
  website: string;
  public_email: string;
  whatsapp: string;
  logo_url: string;
  hero_image_url: string;
  tech_rider_ideal: string;
  tech_rider_alt: string;
  hospitality: string;
  created_at: string;
  updated_at: string;
}

// ─── DTOs / Inputs ──────────────────────────────────────────────────

/** Lo que el form de configuración manda. Excluye campos auto-managed. */
export type DjProfileUpdate = Omit<
  Partial<DjProfile>,
  "user_id" | "created_at" | "updated_at"
>;

// ─── Database root (para typing del cliente Supabase) ───────────────
export interface Database {
  public: {
    Tables: {
      dj_profile: {
        Row: DjProfile;
        Insert: Partial<DjProfile> & { user_id: string };
        Update: DjProfileUpdate;
      };
    };
  };
}
