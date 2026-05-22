-- ════════════════════════════════════════════════════════════════════
-- Migration 0012 — onboarding wizard tracker
-- ────────────────────────────────────────────────────────────────────
-- Agrega columna `onboarding_completed_at` en dj_profile.
-- Si NULL → usuario aún no terminó el wizard /welcome → gate forzado.
-- Si timestamptz → ya pasó por el wizard → acceso normal a (app).
--
-- Backfill: usuarios YA registrados (Jaime y cualquier otro previo)
-- se marcan como completados para no obligarlos al wizard retroactivo.
-- Solo nuevos signups quedan con NULL → ven /welcome.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists onboarding_completed_at timestamptz;

-- Backfill: usuarios existentes ya conocen la app, no obligar wizard
update public.dj_profile
  set onboarding_completed_at = now()
  where onboarding_completed_at is null;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0012 lista
-- ════════════════════════════════════════════════════════════════════
