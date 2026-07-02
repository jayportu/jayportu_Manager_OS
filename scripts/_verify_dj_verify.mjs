// scripts/_verify_dj_verify.mjs
// Verificación end-to-end del flujo de verificación automática.
// Uso: npm run dev (en otra terminal) y luego: node scripts/_verify_dj_verify.mjs
import pg from "pg";
import { readFileSync } from "node:fs";

const env = readFileSync(".env.local", "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { DATABASE_URL, DJ_VERIFY_SECRET } = process.env;
const BASE = "http://localhost:3010";

const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();

// 1) Un DJ no verificado cualquiera para inspección
const { rows } = await client.query(
  "select user_id, artist_name from public.dj_profile where verified_at is null limit 1"
);
if (!rows.length) {
  console.log("No hay DJs sin verificar para probar.");
  await client.end();
  process.exit(0);
}
const dj = rows[0];
console.log("DJ de prueba:", dj.artist_name, dj.user_id);

// 2) 401 sin secret
const r401 = await fetch(`${BASE}/api/admin/dj-verify/evaluate`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ user_id: dj.user_id }),
});
console.log("Sin secret →", r401.status, r401.status === 401 ? "OK" : "FALLA");

// 3) evaluate con secret
const rOk = await fetch(`${BASE}/api/admin/dj-verify/evaluate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${DJ_VERIFY_SECRET}`,
  },
  body: JSON.stringify({ user_id: dj.user_id }),
});
console.log("Con secret →", rOk.status, await rOk.json());

// 4) sweep
const rSweep = await fetch(`${BASE}/api/admin/dj-verify/sweep`, {
  headers: { Authorization: `Bearer ${DJ_VERIFY_SECRET}` },
});
const sweep = await rSweep.json();
console.log(
  `Sweep → verified:${sweep.verified?.length} needs_review:${sweep.needs_review?.length} not_eligible:${sweep.not_eligible_count} total:${sweep.total}`
);

await client.end();
