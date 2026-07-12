-- 0078_booker_onboarding.sql
--
-- F2a · Wizard de bienvenida del booker. onboarding_completed_at gatea el
-- wizard (in-place, patrón BookerTosGate): NULL → se muestra el wizard una vez;
-- con fecha → portal normal.
--
-- Backfill: los bookers EXISTENTES ya usaron el portal, no queremos mostrarles
-- el wizard de golpe → se marcan como completados (created_at). Las cuentas
-- nuevas nacen con NULL (sin default) → ven el wizard una vez.

alter table public.booker_accounts
  add column if not exists onboarding_completed_at timestamptz;

update public.booker_accounts
  set onboarding_completed_at = created_at
  where onboarding_completed_at is null;
