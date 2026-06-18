-- ════════════════════════════════════════════════════════════════════
-- Migration 0058 — search_path en handle_new_user() (auditoría 2026-06-18)
-- ────────────────────────────────────────────────────────────────────
-- handle_new_user() es SECURITY DEFINER y corre en CADA insert de auth.users.
-- Ya tenía `search_path = public` (NO era el caso peligroso de search_path sin
-- fijar), pero omitía `pg_temp`, a diferencia del resto de las funciones definer
-- del esquema (que usan `public, pg_temp`). Esto alinea el patrón: con pg_temp al
-- final, un objeto malicioso creado en un schema temporal no puede anteponerse a
-- los objetos de `public` durante la ejecución de la función.
--
-- Cambio backward-compatible: `alter function ... set` solo ajusta el setting de
-- la función, NO redefine su cuerpo. No hay código dependiente, así que el orden
-- respecto al deploy es indiferente. Idempotente (re-aplicable sin efecto).
-- ════════════════════════════════════════════════════════════════════

alter function public.handle_new_user() set search_path = public, pg_temp;
