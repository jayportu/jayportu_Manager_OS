-- ════════════════════════════════════════════════════════════════════
-- Migration 0054 — blindar beta_status (bypass del paywall)
-- ────────────────────────────────────────────────────────────────────
-- BUG: el mismo agujero que 0053 (is_admin) seguía abierto en los campos
-- de beta. dj_profile.beta_status / beta_approved_at / beta_request_id
-- (0020) viven en dj_profile, y la policy RLS dj_profile_update_own (0001)
-- deja al dueño actualizar su propia fila. El trigger protect_dj_verification
-- (0038→0053) NO revertía beta_status. Resultado: cualquier DJ autenticado
-- podía correr `update dj_profile set beta_status = 'active' where
-- user_id = auth.uid()` (vía PostgREST o la server action saveProfileAction,
-- que hacía passthrough del patch) y auto-renovarse la beta para siempre,
-- saltándose el freeze de assertBetaActive() y el paywall.
--
-- FIX: extender protect_dj_verification() para revertir también
-- beta_status / beta_approved_at / beta_request_id desde cualquier rol que
-- no sea service_role. Solo el backoffice (createAdminClient → service_role)
-- y los flujos de beta/founding (también service_role) pueden setearlos.
--
-- Esta migración SUPERSEDE a 0053: el `create or replace` reescribe la
-- función completa con TODOS los reverts (verified_*, verifications,
-- drop_pick, is_admin Y beta_*). Es idempotente y deja el estado correcto
-- aunque 0053 nunca se haya aplicado en prod.
--
-- Idempotente: create or replace function; el trigger ya apunta a ella.
-- No toca datos ni la estructura de las columnas.
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0054_protect_beta_status.sql
-- ════════════════════════════════════════════════════════════════════

create or replace function public.protect_dj_verification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
begin
  caller_role := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  );

  -- service_role (backoffice admin + flujos beta/founding) puede tocar todo
  if caller_role = 'service_role' then
    return new;
  end if;

  -- Cualquier otro rol: no puede tocar los campos de verificación
  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
  then
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  if new.verifications is distinct from old.verifications then
    new.verifications := old.verifications;
  end if;
  if new.is_drop_pick is distinct from old.is_drop_pick
     or new.drop_pick_priority is distinct from old.drop_pick_priority
  then
    new.is_drop_pick := old.is_drop_pick;
    new.drop_pick_priority := old.drop_pick_priority;
  end if;
  -- escalada de privilegios: un DJ NO puede auto-otorgarse is_admin (0053)
  if new.is_admin is distinct from old.is_admin then
    new.is_admin := old.is_admin;
  end if;
  -- bypass del paywall: un DJ NO puede auto-modificar su estado de beta (0054)
  if new.beta_status is distinct from old.beta_status
     or new.beta_approved_at is distinct from old.beta_approved_at
     or new.beta_request_id is distinct from old.beta_request_id
  then
    new.beta_status := old.beta_status;
    new.beta_approved_at := old.beta_approved_at;
    new.beta_request_id := old.beta_request_id;
  end if;

  return new;
end;
$$;

comment on function public.protect_dj_verification is
  'Migration 0054 — impide vía BEFORE UPDATE que un DJ se auto-modifique campos curados por admin/sistema en su dj_profile: verified_at/verified_by (0038), verifications (0042), is_drop_pick/drop_pick_priority (0043), is_admin (0053) y beta_status/beta_approved_at/beta_request_id (0054). Solo service_role (backoffice + flujos beta) puede setearlos.';
