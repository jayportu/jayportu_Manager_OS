-- ════════════════════════════════════════════════════════════════════
-- Migration 0041 — fee referencial (Fase 1 · 1E)
-- ────────────────────────────────────────────────────────────────────
-- Fee aproximado OPT-IN por DJ (sensible — muchos no querrán mostrarlo).
-- show_fee gobierna si se muestra; fee_min/fee_max = rango en CLP.
-- Aditivo, default off.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists show_fee boolean not null default false,
  add column if not exists fee_min  integer,
  add column if not exists fee_max  integer;
