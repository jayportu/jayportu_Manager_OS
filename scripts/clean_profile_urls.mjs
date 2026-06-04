/**
 * Script local — Limpia las URLs sucias de los perfiles de DJ en prod.
 *
 * Origen: data vieja (seed/import) dejó valores rotos en `soundcloud_url`
 * (y posiblemente otras URLs): sin protocolo, share links pegados dos veces
 * ("soundcloud.com/https://soundcloud.com/foo") o nombres con espacios en vez
 * de handle ("soundcloud.com/NICO VILLEGAS"). Eso hace que el player público
 * muestre "error".
 *
 * Usa la MISMA lógica que el front (src/lib/format.ts normalizeUrl +
 * src/app/p/[slug]/embeds.tsx cleanSoundcloud) para que script y app coincidan.
 *
 * SEGURIDAD:
 *   - DRY-RUN por defecto: solo imprime qué cambiaría, NO escribe nada.
 *   - Escribe SOLO con la flag --apply.
 *   - NUNCA auto-modifica los casos que no puede volver válidos (los marca
 *     como MANUAL para que los arregles a mano). No adivina handles.
 *
 * Uso:
 *   node scripts/clean_profile_urls.mjs            # dry-run (revisar)
 *   node scripts/clean_profile_urls.mjs --apply    # aplica los FIX
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("FALTA NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Lógica espejo del front ────────────────────────────────────────────

/** trim + https:// si falta. "" si queda vacío. (== src/lib/format.ts) */
function normalizeUrl(url) {
  const trimmed = (url ?? "").trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/**
 * Limpia un soundcloud_url. (== cleanSoundcloud de embeds.tsx)
 * Devuelve { embed, link }:
 *   - link: URL clickeable si el host es soundcloud (aunque tenga espacios).
 *   - embed: igual a link pero solo si el path no tiene espacios ni es vacío.
 */
function cleanSoundcloud(raw) {
  let s = (raw ?? "").trim();
  if (!s) return { embed: null, link: null };
  const lastHttp = s.lastIndexOf("http");
  if (lastHttp > 0) s = s.slice(lastHttp); // doble-paste → última URL
  s = normalizeUrl(s);
  let u;
  try {
    u = new URL(s);
  } catch {
    return { embed: null, link: null };
  }
  if (!/(^|\.)soundcloud\.com$/i.test(u.hostname)) return { embed: null, link: null };
  const link = u.toString();
  const path = decodeURIComponent(u.pathname).replace(/^\/+|\/+$/g, "");
  const embed = path.length > 0 && !/\s/.test(path) ? link : null;
  return { embed, link };
}

// Campos URL "simples": solo se normaliza protocolo + trim.
const SIMPLE_URL_FIELDS = ["instagram_url", "youtube_url", "spotify_url", "website"];

async function main() {
  console.log(`\n${APPLY ? "🟠 APPLY" : "🔵 DRY-RUN"} · Limpieza de URLs de perfiles\n`);

  const { data: rows, error } = await supabase
    .from("dj_profile")
    .select(
      "user_id, artist_name, public_slug, soundcloud_url, instagram_url, youtube_url, spotify_url, website"
    );
  if (error) {
    console.error("Error leyendo dj_profile:", error.message);
    process.exit(1);
  }

  const fixes = []; // { user_id, artist_name, patch, changes[] }
  const manual = []; // { artist_name, slug, field, current, reason }

  for (const r of rows ?? []) {
    const patch = {};
    const changes = [];

    // soundcloud_url: lógica especial (repara doble-paste, detecta basura).
    const scRaw = r.soundcloud_url ?? "";
    if (scRaw.trim()) {
      const { embed, link } = cleanSoundcloud(scRaw);
      if (!link) {
        manual.push({
          artist_name: r.artist_name,
          slug: r.public_slug,
          field: "soundcloud_url",
          current: scRaw,
          reason: "no parece una URL de SoundCloud",
        });
      } else if (!embed) {
        manual.push({
          artist_name: r.artist_name,
          slug: r.public_slug,
          field: "soundcloud_url",
          current: scRaw,
          reason: "el path tiene espacios (parece un nombre, no un handle)",
        });
      } else if (embed !== scRaw) {
        patch.soundcloud_url = embed;
        changes.push({ field: "soundcloud_url", from: scRaw, to: embed });
      }
    }

    // Resto de URLs: solo trim + https.
    for (const f of SIMPLE_URL_FIELDS) {
      const cur = r[f] ?? "";
      if (!cur.trim()) continue;
      const norm = normalizeUrl(cur);
      if (norm && norm !== cur) {
        patch[f] = norm;
        changes.push({ field: f, from: cur, to: norm });
      }
    }

    if (changes.length > 0) {
      fixes.push({ user_id: r.user_id, artist_name: r.artist_name, patch, changes });
    }
  }

  // ── Reporte ──
  console.log(`Perfiles totales: ${rows?.length ?? 0}`);
  console.log(`Auto-arreglables (FIX): ${fixes.length}`);
  console.log(`Para revisión MANUAL: ${manual.length}\n`);

  if (fixes.length) {
    console.log("── FIX (se aplican con --apply) ──────────────────────────");
    for (const f of fixes) {
      console.log(`\n• ${f.artist_name || "(sin nombre)"}`);
      for (const c of f.changes) {
        console.log(`    ${c.field}`);
        console.log(`      antes: ${c.from}`);
        console.log(`      después: ${c.to}`);
      }
    }
    console.log("");
  }

  if (manual.length) {
    console.log("── MANUAL (NO se tocan — arréglalos a mano) ──────────────");
    for (const m of manual) {
      console.log(`\n• ${m.artist_name || "(sin nombre)"}  [/p/${m.slug}]`);
      console.log(`    ${m.field}: "${m.current}"`);
      console.log(`    motivo: ${m.reason}`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("🔵 DRY-RUN: no se escribió nada. Corre con --apply para aplicar los FIX.\n");
    return;
  }

  // ── Aplicar (solo FIX) ──
  let ok = 0;
  let err = 0;
  for (const f of fixes) {
    const { error: upErr } = await supabase
      .from("dj_profile")
      .update(f.patch)
      .eq("user_id", f.user_id);
    if (upErr) {
      err++;
      console.error(`  ✗ ${f.artist_name}: ${upErr.message}`);
    } else {
      ok++;
      console.log(`  ✓ ${f.artist_name}`);
    }
  }
  console.log(`\n🟠 APPLY listo: ${ok} actualizados, ${err} con error.`);
  if (manual.length) {
    console.log(`⚠️  ${manual.length} quedaron sin tocar (revisión manual).`);
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
