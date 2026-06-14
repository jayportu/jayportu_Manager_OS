/**
 * Verifica el fix de 0053 contra la DB real (DATABASE_URL de .env.local).
 * Todo corre dentro de UNA transacción con ROLLBACK al final → no toca datos.
 *
 * Simula el rol del caller seteando request.jwt.claims (igual que PostgREST),
 * que es lo que lee protect_dj_verification() para decidir si revierte.
 *
 * Uso: node scripts/verify_protect_is_admin.mjs
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("FALTA DATABASE_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN");

    // Tomamos una fila de prueba que hoy NO es admin.
    const target = await client.query(
      "select user_id from public.dj_profile where is_admin = false limit 1"
    );
    if (target.rows.length === 0) {
      console.error("No hay filas con is_admin=false para probar.");
      process.exitCode = 1;
      return;
    }
    const userId = target.rows[0].user_id;
    console.log(`Fila de prueba: user_id=${userId}\n`);

    // ── Test 1: caller 'authenticated' (un DJ normal) NO debe poder setear is_admin
    await client.query(
      "select set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ role: "authenticated", sub: userId })]
    );
    await client.query(
      "update public.dj_profile set is_admin = true where user_id = $1",
      [userId]
    );
    let r = await client.query(
      "select is_admin from public.dj_profile where user_id = $1",
      [userId]
    );
    check(
      "authenticated NO puede auto-otorgarse is_admin (queda false)",
      r.rows[0].is_admin === false,
      `is_admin=${r.rows[0].is_admin}`
    );

    // ── Test 2: caller anon también bloqueado
    await client.query(
      "select set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ role: "anon" })]
    );
    await client.query(
      "update public.dj_profile set is_admin = true where user_id = $1",
      [userId]
    );
    r = await client.query(
      "select is_admin from public.dj_profile where user_id = $1",
      [userId]
    );
    check(
      "anon NO puede setear is_admin (queda false)",
      r.rows[0].is_admin === false,
      `is_admin=${r.rows[0].is_admin}`
    );

    // ── Test 3: service_role (backoffice) SÍ puede setear is_admin
    await client.query(
      "select set_config('request.jwt.claims', $1, true)",
      [JSON.stringify({ role: "service_role" })]
    );
    await client.query(
      "update public.dj_profile set is_admin = true where user_id = $1",
      [userId]
    );
    r = await client.query(
      "select is_admin from public.dj_profile where user_id = $1",
      [userId]
    );
    check(
      "service_role SÍ puede setear is_admin=true",
      r.rows[0].is_admin === true,
      `is_admin=${r.rows[0].is_admin}`
    );

    // ── Test 4: service_role también puede revocar (true → false)
    await client.query(
      "update public.dj_profile set is_admin = false where user_id = $1",
      [userId]
    );
    r = await client.query(
      "select is_admin from public.dj_profile where user_id = $1",
      [userId]
    );
    check(
      "service_role SÍ puede revocar is_admin=false",
      r.rows[0].is_admin === false,
      `is_admin=${r.rows[0].is_admin}`
    );
  } finally {
    // Nunca commiteamos: la prueba no debe alterar datos.
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }

  console.log(`\n${failures === 0 ? "✓ TODO OK" : `✗ ${failures} fallo(s)`}`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
