/**
 * Unit tests de src/lib/nav-desktop.ts (node:test, sin dependencias).
 * Correr: npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NAV_GROUPS, filterNav } from "../../src/lib/nav-config.ts";
import { buildDesktopNav, activeTopKey } from "../../src/lib/nav-desktop.ts";

const buckets = buildDesktopNav(filterNav(NAV_GROUPS, { showLugares: true }));

test("pliega en 5 buckets top-level en orden", () => {
  assert.deepEqual(buckets.map((b) => b.key), ["dashboard", "perfil", "negocio", "agenda", "mas"]);
});

test("dashboard es directo (sin items de dropdown)", () => {
  const d = buckets.find((b) => b.key === "dashboard")!;
  assert.ok(d.direct);
  assert.equal(d.items.length, 0);
});

test("negocio contiene CRM con su child Recurrentes", () => {
  const n = buckets.find((b) => b.key === "negocio")!;
  const crm = n.items.find((i) => i.href === "/crm")!;
  assert.equal(crm.children?.[0].href, "/crm/recurrentes");
});

test("mas agrupa Produccion+Ayuda+Sistema con sus dheads", () => {
  const m = buckets.find((b) => b.key === "mas")!;
  assert.deepEqual(m.sections?.map((s) => s.section), ["PRODUCCIÓN", "AYUDA", "SISTEMA"]);
});

test("activeTopKey resuelve por ruta", () => {
  assert.equal(activeTopKey(buckets, "/dashboard"), "dashboard");
  assert.equal(activeTopKey(buckets, "/crm/recurrentes"), "negocio");
  assert.equal(activeTopKey(buckets, "/press-kit/stats"), "perfil");
  assert.equal(activeTopKey(buckets, "/growth/ads"), "agenda");
  assert.equal(activeTopKey(buckets, "/configuracion"), "mas");
  assert.equal(activeTopKey(buckets, "/ruta-desconocida"), "dashboard");
});
