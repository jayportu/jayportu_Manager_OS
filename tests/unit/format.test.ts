/**
 * Unit tests de src/lib/format.ts (node:test, sin dependencias).
 * Correr: npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getInitials, isSupabaseStorageUrl, formatClp } from "../../src/lib/format.ts";

test("getInitials: nombre simple de dos palabras", () => {
  assert.equal(getInitials("Nova Ríos"), "NR");
});

test("getInitials: ignora sufijo de país entre paréntesis (bug A( del directorio)", () => {
  assert.equal(getInitials("APRA (UY)"), "A");
  assert.equal(getInitials("GABO (CL)"), "G");
  assert.equal(getInitials("LORENZ (CL)"), "L");
});

test("getInitials: una sola palabra", () => {
  assert.equal(getInitials("SANTIS"), "S");
  assert.equal(getInitials("Sebajager"), "S");
});

test("getInitials: símbolos al inicio de palabra no cuentan como inicial", () => {
  assert.equal(getInitials("¡Fiesta! Total"), "FT");
  assert.equal(getInitials("*NSYNC tribute"), "NT");
});

test("getInitials: corchetes y llaves también se ignoran", () => {
  assert.equal(getInitials("FELIPE [live] MATIAS"), "FM");
});

test("getInitials: vacío/null/undefined → cadena vacía", () => {
  assert.equal(getInitials(""), "");
  assert.equal(getInitials(null), "");
  assert.equal(getInitials(undefined), "");
});

test("getInitials: respeta max", () => {
  assert.equal(getInitials("Uno Dos Tres", 3), "UDT");
  assert.equal(getInitials("Uno Dos Tres"), "UD");
});

test("isSupabaseStorageUrl: acepta solo storage público de supabase.co", () => {
  assert.equal(
    isSupabaseStorageUrl("https://abc.supabase.co/storage/v1/object/public/avatars/x.jpg"),
    true
  );
  assert.equal(isSupabaseStorageUrl("https://evil.com/storage/v1/object/public/x.jpg"), false);
  assert.equal(isSupabaseStorageUrl("no-es-url"), false);
  assert.equal(isSupabaseStorageUrl(null), false);
});

test("formatClp: separador de miles chileno y fallback —", () => {
  assert.equal(formatClp(420000), "$420.000");
  assert.equal(formatClp(null), "—");
});
