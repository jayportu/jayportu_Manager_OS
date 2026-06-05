/**
 * Corre un SQL ad-hoc contra DATABASE_URL (.env.local). Para tareas puntuales.
 * Uso: node scripts/run_sql.mjs "update ... where ..."
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const sql = process.argv[2];
if (!sql) {
  console.error('Uso: node scripts/run_sql.mjs "<sql>"');
  process.exit(1);
}
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
try {
  const res = await client.query(sql);
  console.log(`OK · ${res.rowCount ?? 0} fila(s).`);
  if (res.rows?.length) console.log(JSON.stringify(res.rows, null, 2));
} catch (e) {
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
