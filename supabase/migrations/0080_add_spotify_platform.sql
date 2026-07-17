-- ════════════════════════════════════════════════════════════════════
-- Migration 0080 — Agregar 'spotify' a las plataformas permitidas
-- ════════════════════════════════════════════════════════════════════
-- Para conectar Spotify a la pestaña "Redes" (sync de followers +
-- popularity del artista) necesitamos que 'spotify' sea un valor válido
-- en la columna `platform` (text con CHECK, NO es un enum de Postgres).
--
-- Dos tablas tienen su propio CHECK y hay que ensancharlo:
--   • platform_accounts  (0011): CHECK incluye 'mixcloud'  → MANTENERLO
--   • platform_snapshots (0010): CHECK NO incluye 'mixcloud' → NO agregarlo
--
-- Ambos CHECK se declararon inline y SIN nombre en el `create table`, así
-- que Postgres los auto-nombró `<tabla>_platform_check`. Los borramos con
-- IF EXISTS (idempotente-ish) y los recreamos con el mismo nombre + los
-- mismos valores verbatim + 'spotify'.
-- ════════════════════════════════════════════════════════════════════

-- ─── platform_accounts ───────────────────────────────────────────────
-- Valores originales (0011): instagram, youtube, soundcloud, tiktok,
-- twitter, facebook, mixcloud, otro  →  + spotify (mixcloud SE MANTIENE).
alter table public.platform_accounts
  drop constraint if exists platform_accounts_platform_check;

alter table public.platform_accounts
  add constraint platform_accounts_platform_check
  check (platform in (
    'instagram', 'youtube', 'spotify', 'soundcloud',
    'tiktok', 'twitter', 'facebook', 'mixcloud', 'otro'
  ));

-- ─── platform_snapshots ──────────────────────────────────────────────
-- Valores originales (0010): instagram, youtube, soundcloud, tiktok,
-- twitter, facebook, otro  →  + spotify (SIN mixcloud, no existía acá).
alter table public.platform_snapshots
  drop constraint if exists platform_snapshots_platform_check;

alter table public.platform_snapshots
  add constraint platform_snapshots_platform_check
  check (platform in (
    'instagram', 'youtube', 'spotify', 'soundcloud',
    'tiktok', 'twitter', 'facebook', 'otro'
  ));

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0080 lista
-- ════════════════════════════════════════════════════════════════════
