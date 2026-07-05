/**
 * Unit tests de src/lib/log-safe.ts — enmascarado de PII para logs.
 * Correr: npm run test:unit
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { maskEmail } from "../../src/lib/log-safe.ts";

test("maskEmail: conserva 1ra letra + dominio, oculta el resto", () => {
  assert.equal(maskEmail("dj.ejemplo@gmail.com"), "d***@gmail.com");
});

test("maskEmail: no filtra el local completo", () => {
  const out = maskEmail("nombre.apellido@dropgigs.com");
  assert.doesNotMatch(out, /nombre\.apellido/);
  assert.match(out, /@dropgigs\.com$/);
});

test("maskEmail: null/undefined/vacío → placeholder", () => {
  assert.equal(maskEmail(null), "(sin email)");
  assert.equal(maskEmail(undefined), "(sin email)");
  assert.equal(maskEmail(""), "(sin email)");
});

test("maskEmail: string sin @ no revela contenido", () => {
  assert.equal(maskEmail("no-es-un-email"), "***");
  assert.equal(maskEmail("@sindominio"), "***");
});
