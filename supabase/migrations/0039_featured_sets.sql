-- ════════════════════════════════════════════════════════════════════
-- Migration 0039 — dj_profile.featured_sets (Fase 1 · 1B · Sets destacados)
-- ────────────────────────────────────────────────────────────────────
-- Permite al DJ fijar VARIOS sets/mixes destacados (no solo 1 link), de
-- SoundCloud / Mixcloud / YouTube. El render público detecta la plataforma
-- por la URL y embebe cada uno. Aditivo, default vacío.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists featured_sets text[] not null default '{}'::text[];
