/**
 * Cambia el bucket feedback-screenshots de público a privado.
 * Idempotente: si ya es privado, no hace nada.
 *
 * Después de correr esto, las URLs viejas tipo
 *   https://xxx.supabase.co/storage/v1/object/public/feedback-screenshots/...
 * dejan de funcionar (401). El admin debe acceder vía signed URLs
 * generadas server-side (ya implementado en src/lib/queries/beta.ts).
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

const BUCKET = "feedback-screenshots";

const { data: buckets } = await supabase.storage.listBuckets();
const target = buckets.find((b) => b.name === BUCKET);
if (!target) {
  console.error(`Bucket ${BUCKET} no encontrado.`);
  process.exit(1);
}

if (!target.public) {
  console.log(`✓ ${BUCKET} ya está privado. No-op.`);
  process.exit(0);
}

console.log(`▸ Cambiando ${BUCKET} a privado...`);
const { error } = await supabase.storage.updateBucket(BUCKET, {
  public: false,
});

if (error) {
  console.error(`✗ Error: ${error.message}`);
  process.exit(1);
}

console.log(`✓ ${BUCKET} ahora es PRIVADO.`);
console.log(`  Las URLs públicas viejas tipo /storage/v1/object/public/${BUCKET}/...`);
console.log(`  ahora devuelven 401. El admin debe acceder vía signed URLs.`);
