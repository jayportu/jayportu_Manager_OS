"use server";

import { updateMyProfile } from "@/lib/queries/dj-profile";
import { upsertPlatformAccount } from "@/lib/queries/platform-accounts";
import { revalidatePath } from "next/cache";
import { TOS_VERSION } from "@/lib/legal";
import type { DjProfileUpdate } from "@/types/database";

export interface IdentityInput {
  artist_name: string;
  city: string;
  genres: string[];
}

export interface SocialsInput {
  instagram_url: string;
  spotify_url: string;
  youtube_url: string;
  soundcloud_username: string;
}

export async function saveIdentity(input: IdentityInput) {
  const name = input.artist_name.trim();
  if (!name) throw new Error("El nombre artístico es obligatorio");
  const city = input.city.trim() || "Santiago";
  await updateMyProfile({
    artist_name: name,
    city,
    genres: input.genres.slice(0, 8),
  });
}

export async function saveSocials(input: SocialsInput) {
  const ig = input.instagram_url.trim();
  const sp = input.spotify_url.trim();
  const yt = input.youtube_url.trim();
  const sc = input.soundcloud_username.trim();

  if (!ig && !sp && !yt && !sc) {
    throw new Error("Conecta al menos una red social para continuar");
  }

  const patch: Record<string, string> = {};
  if (ig) patch.instagram_url = ig;
  if (sp) patch.spotify_url = sp;
  if (yt) patch.youtube_url = yt;
  if (sc) patch.soundcloud_url = `https://soundcloud.com/${sc.replace(/^@/, "")}`;

  if (Object.keys(patch).length > 0) {
    await updateMyProfile(patch);
  }

  if (sc) {
    await upsertPlatformAccount({
      platform: "soundcloud",
      username: sc.replace(/^@/, ""),
      auto_sync_enabled: true,
    });
  }

  if (yt) {
    // Guardamos la URL/handle tal cual lo dió el user; el sync-job
    // normaliza con normalizeYouTubeInput al momento de llamar a la API.
    await upsertPlatformAccount({
      platform: "youtube",
      username: yt,
      auto_sync_enabled: true,
    });
  }
}

/**
 * Cierra el onboarding. Si el user todavía no tiene aceptación de
 * Términos registrada (caso típico: signup con Google OAuth, que no
 * pasa por el checkbox del form de email/password), `acceptTos=true`
 * registra tos_accepted_at + versión acá. El wizard exige el checkbox
 * antes de llamar con acceptTos cuando la aceptación falta.
 */
export async function completeOnboarding(acceptTos = false) {
  const patch: DjProfileUpdate = {
    onboarding_completed_at: new Date().toISOString(),
  };
  if (acceptTos) {
    patch.tos_accepted_at = new Date().toISOString();
    patch.tos_version = TOS_VERSION;
  }
  await updateMyProfile(patch);
  revalidatePath("/dashboard");
  revalidatePath("/welcome");
}
