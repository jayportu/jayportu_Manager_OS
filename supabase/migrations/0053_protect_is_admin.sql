-- ════════════════════════════════════════════════════════════════════
-- Migration 0053 — blindar is_admin (escalada de privilegios CRÍTICA)
-- ────────────────────────────────────────────────────────────────────
-- BUG: la columna is_admin (0014) vive en dj_profile, y la policy RLS
-- dj_profile_update_own (0001) deja al dueño actualizar su propia fila
-- (USING/WITH CHECK auth.uid() = user_id). NO había trigger ni guard que
-- impidiera setear is_admin. Resultado: cualquier DJ autenticado podía
-- correr `update dj_profile set is_admin = true where user_id = auth.uid()`
-- vía la API PostgREST (anon/authenticated) y volverse admin — con acceso
-- a beta_requests (PII), feedback_reports, nps_responses, usage_events,
-- founding_invites, email_suppressions y todo el backoffice /admin.
--
-- FIX: mismo patrón anti-tampering que verified_*/verifications/drop_pick.
-- Extendemos protect_dj_verification() (BEFORE UPDATE trigger ya montado en
-- 0038, recreado en 0042/0043) para revertir is_admin desde cualquier rol
-- que no sea service_role. Solo el backoffice (createAdminClient →
-- service_role) puede otorgar o quitar el flag de admin.
--
-- Idempotente: create or replace function; el trigger ya apunta a ella.
-- No toca datos ni la estructura de la columna.
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0053_protect_is_admin.sql
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

  -- service_role (backoffice admin) puede tocar todo
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
  -- escalada de privilegios: un DJ NO puede auto-otorgarse is_admin
  if new.is_admin is distinct from old.is_admin then
    new.is_admin := old.is_admin;
  end if;

  return new;
end;
$$;

comment on function public.protect_dj_verification is
  'Migration 0053 — impide vía BEFORE UPDATE que un DJ se auto-modifique campos curados por admin en su dj_profile: verified_at/verified_by (0038), verifications (0042), is_drop_pick/drop_pick_priority (0043) e is_admin (0053). Solo service_role (backoffice) puede setearlos.';
