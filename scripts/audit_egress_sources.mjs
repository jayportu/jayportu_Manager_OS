/**
 * Mide lo que PODEMOS medir del lado servidor para acotar el egress:
 *  - Storage: bytes + cantidad por bucket + los 8 objetos más grandes.
 *  - Conteo de perfiles públicos (cada carga de /dj y /p/[slug] cuesta query).
 * El egress real (bandwidth) solo lo ve el dashboard; esto acota sospechosos.
 */
import pg from "pg";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function mb(b) { return (Number(b) / 1024 / 1024).toFixed(2) + " MB"; }

await client.connect();
try {
  const perBucket = await client.query(
    `select bucket_id, count(*)::int n, coalesce(sum((metadata->>'size')::bigint),0)::bigint bytes
     from storage.objects group by bucket_id order by bytes desc`
  );
  console.log("\n── STORAGE por bucket ──");
  for (const r of perBucket.rows) {
    console.log(`  ${r.bucket_id.padEnd(22)} ${String(r.n).padStart(4)} archivos · ${mb(r.bytes)}`);
  }

  const biggest = await client.query(
    `select bucket_id, name, (metadata->>'size')::bigint sz
     from storage.objects where metadata->>'size' is not null
     order by sz desc limit 8`
  );
  console.log("\n── 8 objetos más grandes ──");
  for (const r of biggest.rows) {
    console.log(`  ${mb(r.sz).padStart(10)} · ${r.bucket_id}/${r.name}`);
  }

  const counts = await client.query(
    `select
       (select count(*) from dj_profile where hidden_from_directory=false and onboarding_completed_at is not null and public_slug is not null) public_djs,
       (select count(*) from dj_profile where press_kit_pdf_url is not null and press_kit_pdf_url <> '') con_pdf,
       (select count(*) from dj_profile) total_profiles`
  );
  console.log("\n── Perfiles ──");
  const c = counts.rows[0];
  console.log(`  DJs públicos (salen en /dj): ${c.public_djs}`);
  console.log(`  con PDF de press kit: ${c.con_pdf}`);
  console.log(`  perfiles totales: ${c.total_profiles}`);
  console.log("");
} catch (e) {
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
