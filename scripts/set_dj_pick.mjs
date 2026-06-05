/**
 * Marca/desmarca un DJ como DROP Pick (RA-2A) vía service_role (supabase-js).
 * pg directo lo revierte el trigger; hay que ir por service_role.
 * Uso: node scripts/set_dj_pick.mjs <slug> <on|off>
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
  console.error("Uso: node scripts/set_dj_pick.mjs <slug> <on|off>");
  process.exit(1);
}
const { data, error } = await supabase
  .from("dj_profile")
  .update({ is_drop_pick: mode === "on" })
  .eq("public_slug", slug)
  .select("artist_name, is_drop_pick");
console.log(error ? `Error: ${error.message}` : JSON.stringify(data, null, 2));
