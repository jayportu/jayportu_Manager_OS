/**
 * Unit tests de límites antiabuso configurables (F0 · limits.ts).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { envInt, bookerMaxOpenGigs } from "../../src/lib/limits.ts";

test("envInt: usa el default cuando la env no está seteada", () => {
  delete process.env.__TEST_LIMIT__;
  assert.equal(envInt("__TEST_LIMIT__", 7), 7);
});

test("envInt: parsea un entero positivo válido", () => {
  process.env.__TEST_LIMIT__ = "3";
  assert.equal(envInt("__TEST_LIMIT__", 7), 3);
  delete process.env.__TEST_LIMIT__;
});

test("envInt: valores no numéricos / no positivos caen al default", () => {
  for (const bad of ["abc", "", "0", "-4", "1.5.2"]) {
    process.env.__TEST_LIMIT__ = bad;
    assert.equal(envInt("__TEST_LIMIT__", 5), bad === "1.5.2" ? 1 : 5,
      `valor "${bad}"`);
  }
  delete process.env.__TEST_LIMIT__;
});

test("bookerMaxOpenGigs: respeta la env y su default", () => {
  delete process.env.BOOKER_MAX_OPEN_GIGS;
  assert.equal(bookerMaxOpenGigs(), 5);
  process.env.BOOKER_MAX_OPEN_GIGS = "2";
  assert.equal(bookerMaxOpenGigs(), 2);
  delete process.env.BOOKER_MAX_OPEN_GIGS;
});
