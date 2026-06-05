-- ════════════════════════════════════════════════════════════════════
-- Migration 0040 — enriquecimiento de ficha (Fase 1 · 1C + 1D)
-- ────────────────────────────────────────────────────────────────────
-- 1C · brands_worked: marcas/clubs con los que el DJ trabajó (social proof).
-- 1D · aliases: otros nombres / proyectos b2b. record_label: sello.
-- Todo aditivo, defaults vacíos.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists brands_worked text[] not null default '{}'::text[],
  add column if not exists aliases       text[] not null default '{}'::text[],
  add column if not exists record_label  text   not null default '';
