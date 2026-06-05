/**
 * Corre un archivo de migración SQL contra la DB de DATABASE_URL (.env.local).
 * Uso: node scripts/run_migration.mjs supabase/migrations/0038_dj_verified.sql
 *
 * Ejecuta el archivo completo en UNA transacción (BEGIN/COMMIT) → si algo
 * falla, rollback automático y no queda a medias.
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const DATABASE_URL = process.env.DATABASE_URL;
const file = process.argv[2];
if (!DATABASE_URL) {
  console.error("FALTA DATABASE_URL en .env.local");
  process.exit(1);
}
if (!file) {
  console.error("Uso: node scripts/run_migration.mjs <ruta-al-.sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log(`\n→ Aplicando migración: ${file}`);
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✓ Migración aplicada y commiteada.\n");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("✗ Falló — rollback. Error:", e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
