import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const { data, error } = await supabase
  .from("dj_profile")
  .select("artist_name, public_slug, avatar_url, hero_image_url, logo_url, hidden_from_directory, onboarding_completed_at")
  .eq("hidden_from_directory", false)
  .not("onboarding_completed_at", "is", null)
  .not("public_slug", "is", null)
  .not("artist_name", "is", null);

if (error) { console.error(error); process.exit(1); }

console.log(`Total DJs públicos en el directorio: ${data.length}\n`);

let withAvatar = 0, withHero = 0, withBoth = 0, withNone = 0;
for (const dj of data) {
  const a = !!dj.avatar_url;
  const h = !!dj.hero_image_url;
  if (a && h) withBoth++;
  else if (a) withAvatar++;
  else if (h) withHero++;
  else withNone++;
  console.log(`  ${dj.artist_name.padEnd(25)} avatar:${a ? "✓" : "✗"}  hero:${h ? "✓" : "✗"}`);
}

console.log(`\n— Resumen —`);
console.log(`  Con avatar Y hero:       ${withBoth}  (se ven bien en directorio)`);
console.log(`  Solo avatar (sin hero):  ${withAvatar}  ← se ven SIN foto en directorio aunque cargaron avatar`);
console.log(`  Solo hero (sin avatar):  ${withHero}`);
console.log(`  Sin ninguna:             ${withNone}`);
