/**
 * Busca un DJ en dj_profile por artist_name (ILIKE) y devuelve email desde
 * auth.users.
 *
 * Uso:
 *   node scripts/find_dj_by_artist.mjs <artist_name_partial>
 *
 * Ejemplo:
 *   node scripts/find_dj_by_artist.mjs Belixza
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// Cargar .env.local manualmente (sin dotenv como dep)
const envText = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const query = process.argv[2];

if (!SUPABASE_URL || !SERVICE_KEY || !query) {
  console.error("Usage: node scripts/find_dj_by_artist.mjs <artist_name>");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1) Buscar dj_profile por artist_name ILIKE
const { data: profiles, error: pErr } = await supabase
  .from("dj_profile")
  .select("user_id, artist_name, public_slug")
  .ilike("artist_name", `%${query}%`);

if (pErr) {
  console.error("Error querying dj_profile:", pErr.message);
  process.exit(1);
}

if (!profiles || profiles.length === 0) {
  console.log(`No DJ found with artist_name matching "${query}"`);
  process.exit(0);
}

// 2) Para cada profile, buscar email en auth.users
for (const p of profiles) {
  const { data: userResp, error: uErr } = await supabase.auth.admin.getUserById(
    p.user_id
  );
  const email = uErr ? `(error: ${uErr.message})` : userResp?.user?.email;
  console.log(JSON.stringify({
    artist_name: p.artist_name,
    public_slug: p.public_slug,
    user_id: p.user_id,
    email,
  }, null, 2));
}
