/**
 * Verifica / desverifica un DJ por public_slug, vía service_role (exento del
 * trigger protect_dj_verification). Complementa el botón de /admin.
 * Uso: node scripts/set_dj_verified.mjs <public_slug> <on|off>
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

const slug = (process.argv[2] || "").trim();
const mode = (process.argv[3] || "").trim().toLowerCase();
if (!slug || !["on", "off"].includes(mode)) {
  console.error("Uso: node scripts/set_dj_verified.mjs <public_slug> <on|off>");
  process.exit(1);
}

async function main() {
  const verified_at = mode === "on" ? new Date().toISOString() : null;
  const { data, error } = await supabase
    .from("dj_profile")
    .update({ verified_at })
    .eq("public_slug", slug)
    .select("artist_name, public_slug, verified_at");
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.error(`No se encontró DJ con slug "${slug}".`);
    process.exit(1);
  }
  for (const d of data) {
    console.log(`✓ ${d.artist_name || "(sin nombre)"} [${d.public_slug}] → verified_at=${d.verified_at ?? "null"}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
