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
import { fetchYouTubeChannel } from "./youtube";
import { fetchInstagramBusinessProfile } from "./instagram";
import { fetchSpotifyArtist } from "./spotify";
import { santiagoToday, santiagoToUtcISO } from "@/lib/tz";

interface AccountRow {
  id: string;
  user_id: string;
  platform: string;
  username: string;
  external_id: string | null;
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
    let followers: number;
    let trackOrVideoCount: number;
    let externalId: string | null;
    let notes: string;
    let snapshotExtras: Record<string, number | null> = {};

    if (acc.platform === "soundcloud") {
      const profile = await fetchSoundCloudProfile(acc.username);
      followers = profile.followers_count;
      trackOrVideoCount = profile.track_count;
      externalId = profile.external_id;
      notes = `Auto-sync de soundcloud.com/${profile.username}`;
      snapshotExtras = {
        following: profile.followings_count,
        total_likes_lifetime: profile.likes_count,
      };
    } else if (acc.platform === "youtube") {
      const channel = await fetchYouTubeChannel(acc.username);
      if (channel.subscriber_count < 0) {
        throw new Error(
          "El canal tiene los suscriptores ocultos. Activa la visibilidad en YouTube Studio → Settings → Channel → Advanced settings."
        );
      }
      followers = channel.subscriber_count;
      trackOrVideoCount = channel.video_count;
      externalId = channel.channel_id;
      notes = `Auto-sync de youtube.com/${channel.handle || channel.custom_url || channel.channel_id}`;
      snapshotExtras = {
        total_views_lifetime: channel.view_count,
      };
    } else if (acc.platform === "instagram") {
      const p = await fetchInstagramBusinessProfile(acc.username);
      followers = p.followers_count;
      trackOrVideoCount = p.media_count;
      externalId = p.external_id;
      notes = `Auto-sync de instagram.com/${p.username}`;
    } else if (acc.platform === "spotify") {
      // popularity (0-100) reusa el slot de track_count → snapshot.total_posts; la UI lo rotula "Popularidad"
      const a = await fetchSpotifyArtist(acc.external_id || acc.username);
      followers = a.followers;
      trackOrVideoCount = a.popularity;
      externalId = a.external_id;
      notes = `Auto-sync de ${a.url}`;
    } else {
      throw new Error(`Plataforma "${acc.platform}" no soporta auto-sync aún`);
    }

    // Snapshot idempotente POR DÍA (hora Chile): si ya hay uno auto de hoy
    // para este user+plataforma, lo ACTUALIZAMOS en vez de insertar otro. Antes
    // varias corridas el mismo día (cron + manual, reintentos) duplicaban
    // snapshots → el delta day-over-day comparaba dos del mismo día y daba 0.
    const snapshotRow = {
      user_id: acc.user_id,
      platform: acc.platform,
      followers,
      total_posts: trackOrVideoCount,
      notes,
      source: "auto",
      ...snapshotExtras,
    };
    const todayStartUtc = santiagoToUtcISO(santiagoToday(), "00:00:00");
    const { data: todaySnap } = await admin
      .from("platform_snapshots")
      .select("id")
      .eq("user_id", acc.user_id)
      .eq("platform", acc.platform)
      .eq("source", "auto")
      .gte("snapshot_at", todayStartUtc)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error: snapErr } = todaySnap
      ? await admin
          .from("platform_snapshots")
          .update(snapshotRow)
          .eq("id", (todaySnap as { id: string }).id)
      : await admin.from("platform_snapshots").insert(snapshotRow);
    if (snapErr) throw new Error(`Snapshot upsert: ${snapErr.message}`);

    // Actualizar platform_accounts con resultado
    const { error: accErr } = await admin
      .from("platform_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        last_followers: followers,
        last_track_count: trackOrVideoCount,
        external_id: externalId,
        last_error: null,
      })
      .eq("id", acc.id);
    if (accErr) console.error(`[sync] update account ${acc.id}:`, accErr.message);

    const delta =
      acc.last_followers !== null ? followers - acc.last_followers : null;

    return {
      ...base,
      ok: true,
      followers,
      delta,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    const { error: accErr } = await admin
      .from("platform_accounts")
      .update({
        last_synced_at: new Date().toISOString(),
        last_error: msg,
      })
      .eq("id", acc.id);
    if (accErr) console.error(`[sync] update account error ${acc.id}:`, accErr.message);
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
    .select("id, user_id, platform, username, external_id, last_followers")
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
    .select("id, user_id, platform, username, external_id, last_followers")
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
