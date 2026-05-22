/**
 * Sync job de plataformas externas (sin sesión de usuario, usa service_role).
 *
 * Lee todas las platform_accounts con auto_sync_enabled=true,
 * fetchea data pública (SC scraping, Mixcloud API, etc.) y crea
 * un snapshot por cada una con source='auto'.
 *
 * Si una falla, guarda el error en platform_accounts.last_error y
 * sigue con la siguiente — un perfil roto no debe abortar el batch.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSoundCloudProfile } from "./soundcloud";

interface AccountRow {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  last_followers: number | null;
}

interface AccountResult {
  account_id: string;
  platform: string;
  username: string;
  ok: boolean;
  followers?: number;
  delta?: number | null;
  error?: string;
}

async function syncOneAccount(acc: AccountRow): Promise<AccountResult> {
  const admin = createAdminClient();
  const base = {
    account_id: acc.id,
    platform: acc.platform,
    username: acc.username,
  };

  try {
    if (acc.platform !== "soundcloud") {
      throw new Error(`Plataforma "${acc.platform}" no soporta auto-sync aún`);
    }

    const profile = await fetchSoundCloudProfile(acc.username);

    // Insertar snapshot con source='auto'
    const { error: snapErr } = await admin
      .from("platform_snapshots")
      .insert({
        user_id: acc.user_id,
        platform: "soundcloud",
        followers: profile.followers_count,
        following: profile.followings_count,
        total_posts: profile.track_count,
        total_likes_lifetime: profile.likes_count,
        notes: `Auto-sync de soundcloud.com/${profile.username}`,
        source: "auto",
      });
    if (snapErr) throw new Error(`Snapshot insert: ${snapErr.message}`);

    // Actualizar platform_accounts con resultado
    await admin
      .from("platform_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        last_followers: profile.followers_count,
        last_track_count: profile.track_count,
        external_id: profile.external_id,
        last_error: null,
      })
      .eq("id", acc.id);

    const delta =
      acc.last_followers !== null
        ? profile.followers_count - acc.last_followers
        : null;

    return {
      ...base,
      ok: true,
      followers: profile.followers_count,
      delta,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    await admin
      .from("platform_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: msg,
      })
      .eq("id", acc.id);
    return { ...base, ok: false, error: msg };
  }
}

/**
 * Sincroniza solo las cuentas de un usuario (llamado desde UI).
 */
export async function syncUserAccounts(
  userId: string
): Promise<AccountResult[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_accounts")
    .select("id, user_id, platform, username, last_followers")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const results: AccountResult[] = [];
  for (const acc of (data || []) as AccountRow[]) {
    results.push(await syncOneAccount(acc));
  }
  return results;
}

/**
 * Sincroniza TODAS las cuentas con auto_sync_enabled (llamado por cron).
 */
export async function syncAllAutoAccounts(): Promise<{
  total: number;
  ok_count: number;
  error_count: number;
  results: AccountResult[];
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_accounts")
    .select("id, user_id, platform, username, last_followers")
    .eq("auto_sync_enabled", true);
  if (error) throw new Error(error.message);

  const results: AccountResult[] = [];
  for (const acc of (data || []) as AccountRow[]) {
    results.push(await syncOneAccount(acc));
  }

  return {
    total: results.length,
    ok_count: results.filter((r) => r.ok).length,
    error_count: results.filter((r) => !r.ok).length,
    results,
  };
}
