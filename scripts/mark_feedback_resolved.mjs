/**
 * Marca un feedback_reports.row como "resolved" directo en DB (vía service
 * role), SIN pasar por updateFeedbackStatus(). O sea: NO dispara el email
 * automático de fix-followup.
 *
 * Útil cuando:
 *   - Ya mandaste el email manualmente y NO querés duplicar (caso típico
 *     post-fix con notificación a un user específico).
 *   - El reporte estaba "in_progress" desde antes de implementar el auto-email
 *     y querés cerrarlo retroactivamente.
 *   - Es un duplicado / no aplica / dismissed-equivalent y no querés mandar
 *     comunicación.
 *
 * Uso:
 *   node scripts/mark_feedback_resolved.mjs --user-id <uuid> --match <substr> --notes "<text>"
 *   node scripts/mark_feedback_resolved.mjs --id <feedback_id> --notes "<text>"
 *
 *   Flags:
 *     --id <uuid>          ID directo del feedback (más preciso).
 *     --user-id <uuid>     Filtra por user_id.
 *     --match <text>       Filtra por description ILIKE %text% (case-insensitive).
 *                          Útil si no tenés el ID a mano.
 *     --notes <text>       admin_notes a guardar (resumen del fix).
 *     --dry                Preview sin update.
 *
 *   Si --user-id + --match matchean más de 1 row, aborta y lista los matches.
 *   Si matchea 0, aborta también.
 *
 * Ejemplo (Belixza · timezone calendar):
 *   node scripts/mark_feedback_resolved.mjs \
 *     --user-id bdba324d-ba89-4602-ac46-67e56d2c8c1e \
 *     --match "fecha del" \
 *     --notes "Bug timezone calendar — fixed commit 0fb5f78. Email manual ya enviado."
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === "--dry") {
    args.dry = true;
  } else if (a.startsWith("--")) {
    args[a.slice(2)] = process.argv[++i];
  }
}

if ((!args.id && !args["user-id"]) || !args.notes) {
  console.error(
    "Usage: node scripts/mark_feedback_resolved.mjs --id <feedback-id> --notes \"<text>\"\n" +
      "   or: node scripts/mark_feedback_resolved.mjs --user-id <uuid> --match <substr> --notes \"<text>\"\n" +
      "Add --dry to preview without updating."
  );
  process.exit(1);
}

// Cargar .env.local manualmente
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

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Buscar el(los) feedback(s)
let q = supabase.from("feedback_reports").select("*");
if (args.id) q = q.eq("id", args.id);
if (args["user-id"]) q = q.eq("user_id", args["user-id"]);
if (args.match) q = q.ilike("description", `%${args.match}%`);

const { data: matches, error: searchErr } = await q;
if (searchErr) {
  console.error("Error querying:", searchErr.message);
  process.exit(1);
}

if (!matches || matches.length === 0) {
  console.log("No feedback matched. Aborting.");
  process.exit(0);
}

if (matches.length > 1) {
  console.log(`${matches.length} feedbacks matched — refiná el filtro:\n`);
  for (const m of matches) {
    console.log(
      `  · [${m.id}] status=${m.status} kind=${m.kind} created=${m.created_at}\n      "${m.description.slice(0, 100)}${m.description.length > 100 ? "..." : ""}"\n`
    );
  }
  process.exit(1);
}

const target = matches[0];
console.log(`Found 1 match:`);
console.log(`  id:          ${target.id}`);
console.log(`  user_id:     ${target.user_id}`);
console.log(`  kind:        ${target.kind}`);
console.log(`  status:      ${target.status}  →  resolved`);
console.log(`  description: ${target.description.slice(0, 100)}${target.description.length > 100 ? "..." : ""}`);
console.log(`  notes:       ${args.notes}`);

if (args.dry) {
  console.log(`\n(--dry: no update applied)`);
  process.exit(0);
}

const { error: updErr } = await supabase
  .from("feedback_reports")
  .update({
    status: "resolved",
    admin_notes: args.notes.slice(0, 1000),
  })
  .eq("id", target.id);

if (updErr) {
  console.error("\n✗ Update failed:", updErr.message);
  process.exit(1);
}

console.log(`\n✓ Status updated to "resolved". No email sent (direct DB write).`);
