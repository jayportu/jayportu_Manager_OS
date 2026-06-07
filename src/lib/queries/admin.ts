/**
 * Queries del backoffice.
 *
 * IMPORTANTE: estas funciones bypassean RLS via service_role. Solo deben
 * llamarse desde rutas que YA validaron is_admin con assertAdmin(). De
 * lo contrario un user normal podría leer toda la DB.
 */
import "server-only";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { AccountStatus } from "@/types/database";

/**
 * Verifica que el user logueado tenga is_admin=true.
 * Si no, redirige a /dashboard. Llamar al inicio de cualquier ruta
 * o action del backoffice.
 */
export async function assertAdmin(): Promise<{ userId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("dj_profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) redirect("/dashboard");
  return { userId: user.id };
}

/**
 * Lee si el user actual es admin (sin redirigir). Útil para condicionales
 * en el layout/sidebar.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("dj_profile")
    .select("is_admin")
    .eq("user_id", user.id)
    .maybeSingle();
  return data?.is_admin === true;
}

// ─── Datos del backoffice ────────────────────────────────────────────

export interface AdminUserRow {
  user_id: string;
  email: string;
  artist_name: string;
  city: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_admin: boolean;
  verified_at: string | null;
  verifications: string[];
  is_drop_pick: boolean;
  onboarding_completed_at: string | null;
  account_status: AccountStatus;
  account_status_reason: string | null;
  account_status_changed_at: string | null;
  contacts_count: number;
  posts_count: number;
  snapshots_count: number;
  campaigns_count: number;
}

export interface GlobalMetrics {
  total_users: number;
  users_with_onboarding: number;
  total_contacts: number;
  total_snapshots: number;
  total_posts: number;
  total_campaigns: number;
  push_subscribers: number;
  signups_last_7d: number;
  signups_last_30d: number;
  active_last_7d: number;
}

/**
 * Trae TODOS los auth users paginando (listUsers topa por página). Antes se
 * pedía page:1/perPage:200 y se perdían los users >200 en la tabla admin y en
 * el conteo "Activos 7d".
 */
type AuthAdmin = ReturnType<typeof createAdminClient>["auth"]["admin"];
async function listAllAuthUsers(authAdmin: AuthAdmin): Promise<User[]> {
  const all: User[] = [];
  const perPage = 1000;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await authAdmin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers: ${error.message}`);
    const users = data?.users ?? [];
    all.push(...users);
    if (users.length < perPage) break;
  }
  return all;
}

/**
 * Lista todos los users con métricas básicas.
 * Hace 1 query a auth.users + 1 query agregada a dj_profile JOIN counts.
 */
export async function getAllUsers(): Promise<AdminUserRow[]> {
  const admin = createAdminClient();

  // 1) Auth users — necesitamos email y last_sign_in_at que no están en dj_profile
  const authUsers = await listAllAuthUsers(admin.auth.admin);

  const authById = new Map<
    string,
    { email: string; last_sign_in_at: string | null }
  >();
  for (const u of authUsers) {
    authById.set(u.id, {
      email: u.email || "(sin email)",
      last_sign_in_at: u.last_sign_in_at ?? null,
    });
  }

  // 2) dj_profile rows
  const { data: profiles, error: pErr } = await admin
    .from("dj_profile")
    .select(
      "user_id, artist_name, city, created_at, is_admin, verified_at, verifications, is_drop_pick, onboarding_completed_at, account_status, account_status_reason, account_status_changed_at"
    )
    .order("created_at", { ascending: false });
  if (pErr) throw new Error(`dj_profile: ${pErr.message}`);

  // 3) Counts por user (1 query por tabla, agrupando)
  const userIds = (profiles || []).map((p) => p.user_id);
  const counts = await getCountsByUser(userIds);

  return (profiles || []).map((p) => {
    const auth = authById.get(p.user_id);
    const c = counts[p.user_id] || {
      contacts: 0,
      posts: 0,
      snapshots: 0,
      campaigns: 0,
    };
    return {
      user_id: p.user_id,
      email: auth?.email || "(sin auth)",
      artist_name: p.artist_name || "",
      city: p.city || "",
      created_at: p.created_at,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      is_admin: p.is_admin === true,
      verified_at: p.verified_at ?? null,
      verifications: (p.verifications as string[] | null) ?? [],
      is_drop_pick: p.is_drop_pick === true,
      onboarding_completed_at: p.onboarding_completed_at,
      account_status: (p.account_status as AccountStatus) ?? "active",
      account_status_reason: p.account_status_reason ?? null,
      account_status_changed_at: p.account_status_changed_at ?? null,
      contacts_count: c.contacts,
      posts_count: c.posts,
      snapshots_count: c.snapshots,
      campaigns_count: c.campaigns,
    };
  });
}

async function getCountsByUser(userIds: string[]): Promise<
  Record<
    string,
    { contacts: number; posts: number; snapshots: number; campaigns: number }
  >
> {
  if (userIds.length === 0) return {};
  const admin = createAdminClient();
  const out: Record<
    string,
    { contacts: number; posts: number; snapshots: number; campaigns: number }
  > = {};
  for (const id of userIds) {
    out[id] = { contacts: 0, posts: 0, snapshots: 0, campaigns: 0 };
  }

  // contacts
  const { data: c } = await admin
    .from("contacts")
    .select("user_id")
    .in("user_id", userIds);
  for (const row of (c || []) as Array<{ user_id: string }>) {
    if (out[row.user_id]) out[row.user_id].contacts++;
  }

  // content_posts (Sprint 10)
  const { data: p } = await admin
    .from("content_posts")
    .select("user_id")
    .in("user_id", userIds);
  for (const row of (p || []) as Array<{ user_id: string }>) {
    if (out[row.user_id]) out[row.user_id].posts++;
  }

  // platform_snapshots
  const { data: s } = await admin
    .from("platform_snapshots")
    .select("user_id")
    .in("user_id", userIds);
  for (const row of (s || []) as Array<{ user_id: string }>) {
    if (out[row.user_id]) out[row.user_id].snapshots++;
  }

  // growth_campaigns
  const { data: gc } = await admin
    .from("growth_campaigns")
    .select("user_id")
    .in("user_id", userIds);
  for (const row of (gc || []) as Array<{ user_id: string }>) {
    if (out[row.user_id]) out[row.user_id].campaigns++;
  }

  return out;
}

export async function getGlobalMetrics(): Promise<GlobalMetrics> {
  const admin = createAdminClient();
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalUsers },
    { count: usersWithOnboarding },
    { count: totalContacts },
    { count: totalSnapshots },
    { count: totalPosts },
    { count: totalCampaigns },
    { count: pushSubs },
    { count: signups7d },
    { count: signups30d },
  ] = await Promise.all([
    admin.from("dj_profile").select("user_id", { count: "exact", head: true }),
    admin
      .from("dj_profile")
      .select("user_id", { count: "exact", head: true })
      .not("onboarding_completed_at", "is", null),
    admin.from("contacts").select("id", { count: "exact", head: true }),
    admin.from("platform_snapshots").select("id", { count: "exact", head: true }),
    admin.from("content_posts").select("id", { count: "exact", head: true }),
    admin.from("growth_campaigns").select("id", { count: "exact", head: true }),
    admin
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true }),
    admin
      .from("dj_profile")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", d7),
    admin
      .from("dj_profile")
      .select("user_id", { count: "exact", head: true })
      .gte("created_at", d30),
  ]);

  // Active last 7d: contar users con auth.last_sign_in_at >= d7
  // No hay forma directa de query — leemos via admin listUsers (paginado).
  let active7d = 0;
  const allAuthUsers = await listAllAuthUsers(admin.auth.admin);
  for (const u of allAuthUsers) {
    if (u.last_sign_in_at && u.last_sign_in_at >= d7) active7d++;
  }

  return {
    total_users: totalUsers ?? 0,
    users_with_onboarding: usersWithOnboarding ?? 0,
    total_contacts: totalContacts ?? 0,
    total_snapshots: totalSnapshots ?? 0,
    total_posts: totalPosts ?? 0,
    total_campaigns: totalCampaigns ?? 0,
    push_subscribers: pushSubs ?? 0,
    signups_last_7d: signups7d ?? 0,
    signups_last_30d: signups30d ?? 0,
    active_last_7d: active7d,
  };
}
