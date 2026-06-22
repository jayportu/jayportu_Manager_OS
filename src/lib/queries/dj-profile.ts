/**
 * Server-only queries para la tabla dj_profile.
 * No importar desde Client Components — usar Server Actions o Route Handlers.
 */
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DjProfile, DjProfileUpdate } from "@/types/database";

/**
 * Allowlist de columnas que el DUEÑO del perfil puede editar desde la app.
 *
 * SEGURIDAD (auditoría 2026-06-13): `updateMyProfile` recibía el `patch` del
 * cliente y lo pasaba tal cual a `.update()`. Como la fila es propia, RLS lo
 * permitía — pero RLS NO restringe columnas. Un usuario podía mandar
 * `{ is_admin: true }` o `{ beta_status: "active" }` y auto-promoverse a admin
 * o saltarse el paywall de la beta. Acá filtramos a SOLO los campos que el user
 * tiene derecho a tocar; todo lo demás (is_admin, beta_status, verified_*,
 * account_status, is_drop_pick, public_slug, etc.) se descarta en silencio.
 * El trigger protect_dj_verification (migración 0053) es la defensa a nivel DB.
 */
const EDITABLE_PROFILE_FIELDS = [
  // Identidad pública
  "artist_name", "tagline", "bio_short", "bio_long", "genres", "city", "country",
  // Canales / redes
  "instagram_url", "soundcloud_url", "youtube_url", "spotify_url",
  "beatport_url", "bandcamp_url", "website",
  "featured_sets", "beatport_releases", "brands_worked", "aliases", "record_label",
  // Fee opt-in
  "show_fee", "fee_min", "fee_max",
  // Contacto público
  "public_email", "whatsapp",
  // Branding / imágenes
  "logo_url", "hero_image_url", "avatar_url",
  // Tech rider / hospitality
  "tech_rider_ideal", "tech_rider_alt", "hospitality",
  // Press kit
  "press_kit_mode", "press_kit_pdf_url", "press_kit_pdf_filename", "press_kit_pdf_size_bytes",
  // Marketplace / disponibilidad
  "hidden_from_directory", "available_from", "available_until", "available_note",
  // Auto-post (webhook lo valida saveProfileAction con isSafePublicHttpUrl)
  "auto_post_webhook_url", "auto_post_enabled",
  // Onboarding / aceptación de términos (flujo welcome)
  "onboarding_completed_at", "tos_accepted_at", "tos_version",
] as const satisfies readonly (keyof DjProfile)[];

function pickEditableProfileFields(patch: DjProfileUpdate): DjProfileUpdate {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      out[key] = (patch as Record<string, unknown>)[key];
    }
  }
  return out as DjProfileUpdate;
}

/**
 * Devuelve el dj_profile del user autenticado.
 * El RLS de Postgres asegura que solo se pueda leer el propio.
 */
export async function getMyProfile(): Promise<DjProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("dj_profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No row — el trigger debería haberlo creado. Race condition rara.
      return null;
    }
    console.error("getMyProfile error:", error);
    return null;
  }
  return data as DjProfile;
}

/**
 * Actualiza el dj_profile del user autenticado.
 * Devuelve el profile actualizado o lanza si falla.
 */
export async function updateMyProfile(
  patch: DjProfileUpdate
): Promise<DjProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  // Solo columnas que el dueño puede editar (ver EDITABLE_PROFILE_FIELDS).
  const safePatch = pickEditableProfileFields(patch);

  const { data, error } = await supabase
    .from("dj_profile")
    .update(safePatch)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    console.error("updateMyProfile error:", error);
    throw new Error(error.message);
  }
  return data as DjProfile;
}
