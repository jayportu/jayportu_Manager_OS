"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  upsertPlatformAccount,
  deletePlatformAccount,
} from "@/lib/queries/platform-accounts";
import { syncUserAccounts } from "@/lib/integrations/sync-job";
import { normalizeSoundCloudHandle } from "@/lib/integrations/soundcloud";
import { normalizeYouTubeInput } from "@/lib/integrations/youtube";

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
    if (!raw) return { ok: false, error: "Ingresá el handle o URL del canal" };
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
