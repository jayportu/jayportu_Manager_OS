/**
 * Unit tests de src/lib/auth-errors.ts — traducción es-CL de errores Supabase.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { translateSupabaseError } from "../../src/lib/auth-errors.ts";

test("credenciales inválidas", () => {
  const out = translateSupabaseError("Invalid login credentials");
  assert.match(out, /Email o contraseña incorrectos/);
});

test("rate limit por status 429", () => {
  const out = translateSupabaseError("whatever", 429);
  assert.match(out, /Demasiados intentos/);
});

test("captcha: token ausente (S-6) ya no se muestra crudo", () => {
  const out = translateSupabaseError(
    "captcha protection: request disallowed (no captcha_token found)"
  );
  assert.match(out, /verificación anti-bot/);
  assert.doesNotMatch(out, /captcha protection/);
});

test("captcha: verificación fallida también se traduce", () => {
  const out = translateSupabaseError("captcha verification process failed");
  assert.match(out, /verificación anti-bot/);
});

test("email no confirmado", () => {
  const out = translateSupabaseError("Email not confirmed");
  assert.match(out, /confirmas tu email/i);
});

test("fallback conserva el mensaje original con contexto", () => {
  const out = translateSupabaseError("Mensaje rarísimo XYZ");
  assert.match(out, /Mensaje rarísimo XYZ/);
  assert.match(out, /escríbele al admin/);
});
