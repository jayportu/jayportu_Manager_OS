import "server-only";
import { getCachedUser } from "@/lib/supabase/server";
import type {
  PlatformAccount,
  PlatformAccountInsert,
} from "@/types/database";

async function getUserOrThrow() {
  const { supabase, user } = await getCachedUser();
  if (!user) throw new Error("No autenticado");
  return { supabase, user };
}

export async function listPlatformAccounts(): Promise<PlatformAccount[]> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("platform_accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("platform");
  if (error) return [];
  return data as PlatformAccount[];
}

export async function getPlatformAccount(
  platform: string
): Promise<PlatformAccount | null> {
  const { supabase, user } = await getUserOrThrow();
  const { data } = await supabase
    .from("platform_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("platform", platform)
    .maybeSingle();
  return data as PlatformAccount | null;
}

export async function upsertPlatformAccount(
  input: PlatformAccountInsert
): Promise<PlatformAccount> {
  const { supabase, user } = await getUserOrThrow();
  const { data, error } = await supabase
    .from("platform_accounts")
    .upsert(
      {
        user_id: user.id,
        platform: input.platform,
        username: input.username.trim(),
        auto_sync_enabled: input.auto_sync_enabled ?? true,
      },
      { onConflict: "user_id,platform" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as PlatformAccount;
}

export async function deletePlatformAccount(platform: string): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  await supabase
    .from("platform_accounts")
    .delete()
    .eq("user_id", user.id)
    .eq("platform", platform);
}

export async function updateAccountSyncResult(
  accountId: string,
  result: {
    followers: number | null;
    track_count: number | null;
    external_id: string | null;
    error: string | null;
  }
): Promise<void> {
  const { supabase, user } = await getUserOrThrow();
  await supabase
    .from("platform_accounts")
    .update({
      last_synced_at: new Date().toISOString(),
      last_followers: result.followers,
      last_track_count: result.track_count,
      external_id: result.external_id,
      last_error: result.error,
    })
    .eq("id", accountId)
    .eq("user_id", user.id); // defensa en profundidad además de RLS
}
