/**
 * Script local — Crea/refresca un user fantasma para testear F1+F2 de
 * S19 (trial 7d + paywall) en localhost:3010.
 *
 * Idempotente: si el user ya existe, solo lo resetea a estado fresco.
 *
 * Uso:
 *   node scripts/setup_trial_test_user.mjs
 *
 * Output: magic link para loguearte directo en http://localhost:3010
 * como ese user. Su perfil tiene beta_status='none' → entra al flow de
 * trial (NO al de beta legacy).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// Cargar .env.local manualmente (sin depender de dotenv)
const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const TEST_EMAIL = "trial-test@dropdj.local";
const TEST_PASSWORD = "DropTrial2026!";
const TEST_NAME = "TEST TRIAL";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`\n→ Setup user fantasma: ${TEST_EMAIL}`);

  // 1. Buscar si ya existe
  const { data: existing, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) throw listErr;
  let user = existing.users.find((u) => u.email === TEST_EMAIL);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { artist_name: TEST_NAME },
    });
    if (error) throw error;
    user = data.user;
    console.log(`  ✓ user creado · id=${user.id}`);
  } else {
    // Reset password si ya existía (por si lo cambiamos entre runs)
    await supabase.auth.admin.updateUserById(user.id, {
      password: TEST_PASSWORD,
    });
    console.log(`  ✓ user ya existe · id=${user.id} · password reseteada`);
  }

  // 2. Asegurar profile onboarded + beta_status='none' (entra al flow de trial)
  const { error: profErr } = await supabase
    .from("dj_profile")
    .upsert(
      {
        user_id: user.id,
        artist_name: TEST_NAME,
        onboarding_completed_at: new Date().toISOString(),
        beta_status: "none",
        public_slug: `test-trial-${user.id.slice(0, 8)}`,
      },
      { onConflict: "user_id" }
    );
  if (profErr) {
    console.error("  ✗ profile upsert error:", profErr.message);
  } else {
    console.log("  ✓ profile listo (onboarded, beta_status=none)");
  }

  // 3. Borrar cualquier subscription previa → al primer login se recrea fresca
  const { error: delErr } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id);
  if (delErr) {
    console.error("  ✗ subscription delete error:", delErr.message);
  } else {
    console.log("  ✓ subscription anterior limpiada (se recrea al entrar)");
  }

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("  CREDENCIALES DEL USER FANTASMA");
  console.log("══════════════════════════════════════════════════════════════════");
  console.log(`\n  Login URL:  http://localhost:3010/login`);
  console.log(`  Email:      ${TEST_EMAIL}`);
  console.log(`  Password:   ${TEST_PASSWORD}\n`);
  console.log("══════════════════════════════════════════════════════════════════");
  console.log("\nCuando entres vas a ver:");
  console.log("  · Banner naranja 'TRIAL · 7 DÍAS' en el Topbar");
  console.log("  · Todo el OS habilitado (CRM, Calendario, etc)");
  console.log("  · Click en el banner → te lleva a /suscripcion (stub)");
  console.log("\nPara probar otros estados, corré los SQL abajo:");
  console.log("  (cada uno requiere refresh del navegador)\n");
  console.log("--- TRIAL con 2 DÍAS (banner amarillo) ---");
  console.log(`  update subscriptions set trial_ends_at = now() + interval '2 days' where user_id = '${user.id}';\n`);
  console.log("--- TRIAL VENCIDO (modal paywall) ---");
  console.log(`  update subscriptions set trial_ends_at = now() - interval '1 minute' where user_id = '${user.id}';\n`);
  console.log("--- SUSCRIPCIÓN ACTIVA simulada (sin banner, todo normal) ---");
  console.log(`  update subscriptions set status='active', current_period_end = now() + interval '30 days', card_last_4='4521', card_brand='visa' where user_id = '${user.id}';\n`);
  console.log("--- RESET a trial fresco de 7 días ---");
  console.log(`  update subscriptions set status='trial', trial_started_at=now(), trial_ends_at=now()+interval '7 days', current_period_end=null, card_last_4=null, card_brand=null where user_id = '${user.id}';\n`);
}

main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(1);
});
