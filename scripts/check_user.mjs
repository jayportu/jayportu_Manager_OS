/**
 * Diagnóstico read-only de un usuario por email.
 * Uso: node scripts/check_user.mjs <email>
 * Reporta: auth (provider, fechas, metadata), beta_request (status), dj_profile.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Falta el email. Uso: node scripts/check_user.mjs <email>");
  process.exit(1);
}

async function main() {
  console.log(`\n→ Diagnóstico de: ${email}\n`);

  // 1) auth.users (vía admin API; paginamos por si hay muchos)
  let authUser = null;
  for (let page = 1; page <= 20 && !authUser; page++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (!data?.users?.length) break;
    authUser = data.users.find((u) => (u.email || "").toLowerCase() === email) || null;
  }
  if (!authUser) {
    console.log("auth: NO existe usuario con ese email.");
  } else {
    console.log("── AUTH ──");
    console.log("  id:", authUser.id);
    console.log("  created_at:", authUser.created_at);
    console.log("  last_sign_in_at:", authUser.last_sign_in_at);
    console.log("  email_confirmed_at:", authUser.email_confirmed_at);
    console.log("  provider(s):", authUser.app_metadata?.providers || authUser.app_metadata?.provider);
    console.log("  account_type (metadata):", authUser.user_metadata?.account_type ?? "(none → DJ)");
  }

  // 2) beta_requests
  const { data: reqs } = await supabase
    .from("beta_requests")
    .select("id, email, status, created_at, approved_at, artist_name")
    .ilike("email", email);
  console.log("\n── BETA_REQUEST ──");
  if (!reqs?.length) {
    console.log("  ❌ NO hay solicitud de beta para ese email.");
  } else {
    for (const r of reqs) {
      console.log(`  status=${r.status} · created=${r.created_at} · approved=${r.approved_at ?? "—"} · artist=${r.artist_name ?? "—"}`);
    }
  }

  // 3) dj_profile
  if (authUser) {
    const { data: prof } = await supabase
      .from("dj_profile")
      .select("artist_name, beta_status, beta_approved_at, onboarding_completed_at, account_status, public_slug, created_at")
      .eq("user_id", authUser.id)
      .maybeSingle();
    console.log("\n── DJ_PROFILE ──");
    if (!prof) {
      console.log("  (sin dj_profile)");
    } else {
      console.log("  artist_name:", prof.artist_name ?? "(vacío)");
      console.log("  beta_status:", prof.beta_status);
      console.log("  beta_approved_at:", prof.beta_approved_at ?? "—");
      console.log("  onboarding_completed_at:", prof.onboarding_completed_at ?? "— (NO completó onboarding)");
      console.log("  account_status:", prof.account_status);
      console.log("  public_slug:", prof.public_slug ?? "—");
    }
  }
  console.log("");
}

main().catch((e) => { console.error(e); process.exit(1); });
