/**
 * Setea featured_sets de un DJ por public_slug (service_role). Para testear.
 * Uso: node scripts/set_featured_sets.mjs <slug> [url1] [url2] ...
 * Sin URLs → lo vacía ([]).
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
const sets = process.argv.slice(3);
if (!slug) {
  console.error("Uso: node scripts/set_featured_sets.mjs <slug> [url1] [url2] ...");
  process.exit(1);
}

const { data, error } = await supabase
  .from("dj_profile")
  .update({ featured_sets: sets })
  .eq("public_slug", slug)
  .select("artist_name, featured_sets");
if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log(JSON.stringify(data, null, 2));
