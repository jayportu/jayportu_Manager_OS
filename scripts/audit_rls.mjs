/**
 * Auditoría de Row Level Security (RLS) en todas las tablas del schema
 * `public` de la DB de DROP. en Supabase.
 *
 * Conecta directo via DATABASE_URL (Postgres connection string) con
 * service-role-equivalent (DB owner). Lista cada tabla con:
 *   - rls_enabled: ¿está RLS activado?
 *   - row_count: ¿cuántas filas tiene?
 *   - policies: qué policies tiene (cmd, roles, qual, with_check)
 *
 * Después clasifica cada tabla en niveles de riesgo:
 *   🔴 CRÍTICO   — RLS OFF en tabla con datos (cualquiera con anon key puede
 *                   leer/escribir todo)
 *   🟠 ALTO      — RLS ON pero SIN policies (default deny, OK si la app usa
 *                   solo service_role para esta tabla; mal si la app usa
 *                   anon/authenticated)
 *   🟡 MEDIO     — Policies "permisivas" (qual = "true" o similar)
 *   🟢 OK        — RLS ON + policies específicas
 *
 * Uso:
 *   node scripts/audit_rls.mjs
 *
 * Output: tabla en consola + archivo drop_rls_audit.json con detalles.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    })
);

const DATABASE_URL = env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL en .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// ────────────────────────────────────────────────────────────────────────
// Query 1: tablas + estado RLS + row count
// ────────────────────────────────────────────────────────────────────────

const tablesQuery = `
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  COALESCE((SELECT n_live_tup FROM pg_stat_user_tables WHERE relname = c.relname AND schemaname = 'public'), 0) AS row_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- ordinary tables (no views, sequences)
ORDER BY c.relname;
`;

const { rows: tables } = await client.query(tablesQuery);

// ────────────────────────────────────────────────────────────────────────
// Query 2: policies por tabla
// ────────────────────────────────────────────────────────────────────────

const policiesQuery = `
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
`;

const { rows: policies } = await client.query(policiesQuery);

// Group policies by table
const policiesByTable = new Map();
for (const p of policies) {
  if (!policiesByTable.has(p.tablename)) policiesByTable.set(p.tablename, []);
  policiesByTable.get(p.tablename).push(p);
}

await client.end();

// ────────────────────────────────────────────────────────────────────────
// Clasificar y reportar
// ────────────────────────────────────────────────────────────────────────

function classify(table, tablePolicies) {
  if (!table.rls_enabled) {
    return {
      level: "CRÍTICO",
      icon: "🔴",
      reason:
        table.row_count > 0
          ? `RLS OFF y tabla tiene ${table.row_count} filas. Cualquier sesión con anon/authenticated key puede leer/escribir libremente.`
          : "RLS OFF (tabla vacía, riesgo bajo hoy pero hay que activar antes de que entren datos)",
    };
  }
  if (tablePolicies.length === 0) {
    return {
      level: "ALTO",
      icon: "🟠",
      reason:
        "RLS ON pero sin policies. Por default, anon/authenticated NO pueden leer ni escribir. OK si la app accede vía service_role. Mal si la app espera acceso desde el cliente.",
    };
  }
  // Detectar policies "permisivas"
  const permissive = tablePolicies.filter(
    (p) => p.qual === "true" || /^\s*true\s*$/i.test(String(p.qual || ""))
  );
  if (permissive.length > 0) {
    return {
      level: "MEDIO",
      icon: "🟡",
      reason: `Tiene ${permissive.length} policy(s) con qual="true" (sin restricción real). Verificar si son intencionales (ej. tabla de read-only public como dj_profile pública).`,
    };
  }
  return {
    level: "OK",
    icon: "🟢",
    reason: `${tablePolicies.length} policy(s) específica(s).`,
  };
}

const report = tables.map((t) => {
  const tablePolicies = policiesByTable.get(t.table_name) || [];
  const classification = classify(t, tablePolicies);
  return {
    table: t.table_name,
    rls_enabled: t.rls_enabled,
    rls_forced: t.rls_forced,
    row_count: t.row_count,
    policies_count: tablePolicies.length,
    policies: tablePolicies.map((p) => ({
      name: p.policyname,
      cmd: p.cmd,
      roles: p.roles,
      qual: p.qual,
      with_check: p.with_check,
    })),
    classification,
  };
});

// ────────────────────────────────────────────────────────────────────────
// Imprimir reporte en consola
// ────────────────────────────────────────────────────────────────────────

console.log(`\n╔══════════════════════════════════════════════════════════════╗`);
console.log(`║          AUDITORÍA RLS · DROP. — schema public               ║`);
console.log(`╚══════════════════════════════════════════════════════════════╝\n`);

const counts = { CRÍTICO: 0, ALTO: 0, MEDIO: 0, OK: 0 };
for (const r of report) counts[r.classification.level]++;

console.log(`Total tablas: ${report.length}`);
console.log(`🔴 CRÍTICO: ${counts.CRÍTICO}`);
console.log(`🟠 ALTO:    ${counts.ALTO}`);
console.log(`🟡 MEDIO:   ${counts.MEDIO}`);
console.log(`🟢 OK:      ${counts.OK}\n`);

// Ordenar por severidad
const order = { CRÍTICO: 0, ALTO: 1, MEDIO: 2, OK: 3 };
report.sort(
  (a, b) =>
    order[a.classification.level] - order[b.classification.level] ||
    a.table.localeCompare(b.table)
);

for (const r of report) {
  console.log(
    `${r.classification.icon} ${r.classification.level.padEnd(8)} · ${r.table.padEnd(30)} · ${r.row_count} filas · RLS=${r.rls_enabled ? "ON " : "OFF"} · ${r.policies_count} polic.`
  );
  if (r.classification.level !== "OK") {
    console.log(`   └─ ${r.classification.reason}`);
  }
}

// ────────────────────────────────────────────────────────────────────────
// JSON con detalle de policies (para review profundo)
// ────────────────────────────────────────────────────────────────────────

const outPath = resolve(process.cwd(), "drop_rls_audit.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(`\n✓ Detalle completo (policies) en: ${outPath}\n`);
