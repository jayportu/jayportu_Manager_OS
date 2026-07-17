"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  upsertPlatformAccount,
  deletePlatformAccount,
  updateAccountSyncResult,
} from "@/lib/queries/platform-accounts";
import { syncUserAccounts } from "@/lib/integrations/sync-job";
import { normalizeSoundCloudHandle } from "@/lib/integrations/soundcloud";
import { normalizeYouTubeInput } from "@/lib/integrations/youtube";
import {
  isSpotifyConfigured,
  parseSpotifyArtistId,
  fetchSpotifyArtist,
} from "@/lib/integrations/spotify";
import {
  isMetaConfigured,
  normalizeInstagramHandle,
  fetchInstagramBusinessProfile,
  InstagramNotEligibleError,
} from "@/lib/integrations/instagram";

type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function err(e: unknown): { ok: false; error: string } {
  return { ok: false, error: e instanceof Error ? e.message : "Error" };
}

export async function saveSoundCloudAccountAction(input: {
  username: string;
  auto_sync_enabled?: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    const handle = normalizeSoundCloudHandle(input.username);
    if (!handle || !/^[a-zA-Z0-9_-]+$/.test(handle)) {
      return { ok: false, error: "Username inválido" };
    }
    const acc = await upsertPlatformAccount({
      platform: "soundcloud",
      username: handle,
      auto_sync_enabled: input.auto_sync_enabled ?? true,
    });
    revalidatePath("/configuracion");
    revalidatePath("/growth");
    return { ok: true, data: { id: acc.id } };
  } catch (e) {
    return err(e);
  }
}

export async function saveYouTubeAccountAction(input: {
  handle: string;
  auto_sync_enabled?: boolean;
}): Promise<Result<{ id: string }>> {
  try {
    const raw = input.handle.trim();
    if (!raw) return { ok: false, error: "Ingresa el handle o URL del canal" };
    // Validar que normalize produzca algo válido
    const norm = normalizeYouTubeInput(raw);
    if (!norm.value || norm.value.length > 100) {
      return { ok: false, error: "Handle/URL inválido" };
    }
    // Guardamos el input tal cual lo dió el user (el sync resuelve)
    const acc = await upsertPlatformAccount({
      platform: "youtube",
      username: raw,
      auto_sync_enabled: input.auto_sync_enabled ?? true,
    });
    revalidatePath("/configuracion");
    revalidatePath("/growth");
    return { ok: true, data: { id: acc.id } };
  } catch (e) {
    return err(e);
  }
}

export async function saveSpotifyAccountAction(input: {
  url: string;
}): Promise<Result<{ id: string }>> {
  try {
    if (!isSpotifyConfigured()) {
      return {
        ok: false,
        error:
          "Spotify no está disponible todavía (falta configurar la integración).",
      };
    }
    const id = parseSpotifyArtistId(input.url);
    if (!id) {
      return {
        ok: false,
        error:
          "Pega el link de tu perfil de ARTISTA en Spotify (open.spotify.com/artist/...).",
      };
    }
    let artist;
    try {
      artist = await fetchSpotifyArtist(id);
    } catch {
      return {
        ok: false,
        error: "No pudimos verificar ese artista en Spotify. Revisa el link o prueba de nuevo en un momento.",
      };
    }
    const acc = await upsertPlatformAccount({
      platform: "spotify",
      username: artist.name,
    });
    // best-effort: la cuenta ya quedó guardada aunque falle poblar stats
    try {
      await updateAccountSyncResult(acc.id, {
        followers: artist.followers,
        track_count: artist.popularity,
        external_id: artist.external_id,
        error: null,
      });
    } catch {
      // ignore
    }
    revalidatePath("/configuracion");
    revalidatePath("/growth");
    return { ok: true, data: { id: acc.id } };
  } catch (e) {
    return err(e);
  }
}

export async function saveInstagramAccountAction(input: {
  username: string;
}): Promise<Result<{ id: string }>> {
  try {
    if (!isMetaConfigured()) {
      return {
        ok: false,
        error:
          "Instagram no está disponible todavía (falta configurar la integración).",
      };
    }
    const handle = normalizeInstagramHandle(input.username);
    if (!handle) {
      return { ok: false, error: "Ingresa tu usuario de Instagram" };
    }
    let profile;
    try {
      profile = await fetchInstagramBusinessProfile(handle);
    } catch (e) {
      if (e instanceof InstagramNotEligibleError) {
        return {
          ok: false,
          error:
            "Esta cuenta no cumple las condiciones para enlazar: tiene que ser una cuenta Business o Creator y pública en Instagram.",
        };
      }
      return {
        ok: false,
        error:
          "No pudimos verificar esa cuenta de Instagram. Prueba de nuevo en un momento.",
      };
    }
    const acc = await upsertPlatformAccount({
      platform: "instagram",
      username: handle,
    });
    // best-effort: la cuenta ya quedó guardada aunque falle poblar stats
    try {
      await updateAccountSyncResult(acc.id, {
        followers: profile.followers_count,
        track_count: profile.media_count,
        external_id: profile.external_id,
        error: null,
      });
    } catch {
      // ignore
    }
    revalidatePath("/configuracion");
    revalidatePath("/growth");
    return { ok: true, data: { id: acc.id } };
  } catch (e) {
    return err(e);
  }
}

export async function deletePlatformAccountAction(
  platform: string
): Promise<Result> {
  try {
    await deletePlatformAccount(platform);
    revalidatePath("/configuracion");
    revalidatePath("/growth");
    return { ok: true, data: undefined };
  } catch (e) {
    return err(e);
  }
}

export async function syncNowAction(): Promise<
  Result<{ total: number; ok_count: number; error_count: number }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "No autenticado" };

    const results = await syncUserAccounts(user.id);
    revalidatePath("/configuracion");
    revalidatePath("/growth");
    return {
      ok: true,
      data: {
        total: results.length,
        ok_count: results.filter((r) => r.ok).length,
        error_count: results.filter((r) => !r.ok).length,
      },
    };
  } catch (e) {
    return err(e);
  }
}
