/**
 * Unit tests de la lógica pura del gate de bookers (F0 · booker-access.ts).
 * Cubre los 5 casos del plan: activo, suspendido, baneado, sin-fila y
 * verificación requerida.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateBookerAccess } from "../../src/lib/queries/booker-access.ts";

test("activo verificado → ok", () => {
  const v = evaluateBookerAccess({
    account_status: "active",
    verified_at: "2026-01-01T00:00:00Z",
  });
  assert.equal(v.ok, true);
});

test("activo NO verificado → ok cuando no se exige verificación", () => {
  const v = evaluateBookerAccess({ account_status: "active", verified_at: null });
  assert.equal(v.ok, true);
});

test("activo NO verificado + requireVerified → not_verified", () => {
  const v = evaluateBookerAccess(
    { account_status: "active", verified_at: null },
    { requireVerified: true }
  );
  assert.deepEqual(v, { ok: false, reason: "not_verified" });
});

test("suspendido → suspended (gana sobre verificación)", () => {
  const v = evaluateBookerAccess(
    { account_status: "suspended", verified_at: "2026-01-01T00:00:00Z" },
    { requireVerified: true }
  );
  assert.deepEqual(v, { ok: false, reason: "suspended" });
});

test("baneado → banned", () => {
  const v = evaluateBookerAccess({
    account_status: "banned",
    verified_at: "2026-01-01T00:00:00Z",
  });
  assert.deepEqual(v, { ok: false, reason: "banned" });
});

test("sin fila (null/undefined) → no_account", () => {
  assert.deepEqual(evaluateBookerAccess(null), {
    ok: false,
    reason: "no_account",
  });
  assert.deepEqual(evaluateBookerAccess(undefined), {
    ok: false,
    reason: "no_account",
  });
});
