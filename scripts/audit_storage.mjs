/**
 * Auditoría de Storage buckets en Supabase. Lista:
 *   - Cada bucket
 *   - Si es público (cualquier URL pública accesible) o privado
 *   - Cantidad de archivos
 *   - Tamaño total
 *
 * Después clasifica cada bucket:
 *   🔴 PÚBLICO con contenido sensible → fix urgente
 *   🟡 PÚBLICO con contenido by-design (avatars, logos) → OK
 *   🟢 PRIVADO → OK
 */

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

// Listar buckets
const { data: buckets, error } = await supabase.storage.listBuckets();
if (error) {
  console.error("Error listing buckets:", error.message);
  process.exit(1);
}

console.log(`\n━━━ STORAGE BUCKETS AUDIT ━━━\n`);
console.log(`Total buckets: ${buckets.length}\n`);

for (const b of buckets) {
  // Contar archivos (limit 1000 por simplicidad)
  const { data: files } = await supabase.storage
    .from(b.name)
    .list("", { limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } });
  const fileCount = files?.length || 0;
  const totalBytes = (files || []).reduce(
    (acc, f) => acc + (f.metadata?.size || 0),
    0
  );

  const visibility = b.public ? "🟡 PÚBLICO" : "🟢 PRIVADO";
  console.log(`${visibility}  ${b.name.padEnd(30)} files: ${fileCount}, ${(totalBytes / 1024).toFixed(1)} KB`);
  console.log(`         created: ${b.created_at}, updated: ${b.updated_at}`);
  if (b.public) {
    console.log(`         ⚠ Cualquier URL bajo /storage/v1/object/public/${b.name}/... es accesible sin auth.`);
  }
  console.log("");
}

console.log(`\n━━━ ANÁLISIS ━━━\n`);
console.log(`Buckets que DEBEN ser públicos by design:`);
console.log(`  - avatars              (fotos visibles en /dj público)`);
console.log(`  - press-kit-pdfs (?)  (PDFs accesibles desde /p/[slug])`);
console.log(``);
console.log(`Buckets que DEBEN ser privados:`);
console.log(`  - feedback-screenshots (pueden contener tokens/info del CRM en visualizaciones de bug)`);
console.log(``);
console.log(`Hallazgos críticos vs status actual → revisar arriba.`);
