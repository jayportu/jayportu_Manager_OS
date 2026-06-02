/**
 * Script local — Crea/refresca un BOOKER fantasma para testear el portal
 * booker (Fases 1-2) y el ruteo de login en localhost:3010.
 *
 * Idempotente. Uso:  node scripts/setup_booker_test_user.mjs
 *
 * El user tiene account_type='booker' en metadata → handle_new_user NO le
 * crea dj_profile (migration 0033) → el layout /booker lo trata como booker.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TEST_EMAIL = "booker-test@dropgigs.local";
const TEST_PASSWORD = "DropBooker2026!";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`\n→ Setup booker fantasma: ${TEST_EMAIL}`);
  const { data: existing } = await supabase.auth.admin.listUsers();
  let user = existing.users.find((u) => u.email === TEST_EMAIL);

  const meta = {
    account_type: "booker",
    full_name: "Club Test Demo",
    booker_type: "venue",
    city: "Santiago",
  };

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: meta,
    });
    if (error) throw error;
    user = data.user;
    console.log(`  ✓ booker creado · id=${user.id}`);
  } else {
    await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
      user_metadata: meta,
    });
    console.log(`  ✓ booker ya existe · id=${user.id} · password reseteada`);
  }

  // Sanity: NO debe tener dj_profile (migration 0033)
  const { data: dj } = await supabase
    .from("dj_profile")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  console.log(`  ${dj ? "✗ TIENE dj_profile (mal)" : "✓ sin dj_profile (correcto)"}`);

  console.log("\n  Login: http://localhost:3010/login");
  console.log(`  Email: ${TEST_EMAIL}  ·  Password: ${TEST_PASSWORD}`);
  console.log("  Debe rutear a /booker/requests (no /dashboard).\n");
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
