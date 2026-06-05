/**
 * Setea verifications de un DJ (Fase 1 · 1F) vía service_role (supabase-js) —
 * necesario porque el trigger protect_dj_verification revierte escrituras de
 * columnas protegidas que NO vengan con JWT service_role (un pg directo no sirve).
 * Uso: node scripts/set_dj_verifications.mjs <slug> identity,socials,sets
 * Sin lista → lo vacía.
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
const keys = (process.argv[3] || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!slug) {
  console.error("Uso: node scripts/set_dj_verifications.mjs <slug> identity,socials,sets");
  process.exit(1);
}
const { data, error } = await supabase
  .from("dj_profile")
  .update({ verifications: keys })
  .eq("public_slug", slug)
  .select("artist_name, verifications");
if (error) {
  console.error("Error:", error.message);
  process.exit(1);
}
console.log(JSON.stringify(data, null, 2));
