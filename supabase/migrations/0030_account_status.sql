-- ════════════════════════════════════════════════════════════════════
-- Migration 0030 — account status (suspender / banear cuentas)
-- ────────────────────────────────────────────────────────────────────
-- Agrega control de estado de cuenta a dj_profile para que los admins
-- (Jaime + Fer) puedan suspender (temporal) o banear (permanente) a un
-- usuario que viole los Términos de servicio.
--
-- Estados:
--   'active'    — normal, acceso completo (default)
--   'suspended' — bloqueado temporalmente, reversible
--   'banned'    — cuenta cerrada permanentemente
--
-- El gating de acceso vive en src/app/(app)/layout.tsx: un user con
-- status 'suspended'|'banned' (y NO admin) es redirigido a
-- /cuenta-suspendida. Los admins quedan exentos.
--
-- SEGURIDAD: un user puede editar su propio dj_profile (bio, redes, etc.)
-- vía RLS. Sin protección, un user suspendido podría hacer un UPDATE
-- directo a account_status='active' y bypassear el bloqueo. El trigger
-- protect_account_status() revierte cualquier cambio a los campos de
-- estado hecho por un rol que NO sea service_role. El admin cambia el
-- estado vía createAdminClient() (service_role), que sí puede.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Columnas ────────────────────────────────────────────────────
alter table public.dj_profile
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'banned')),
  add column if not exists account_status_reason text,
  add column if not exists account_status_changed_at timestamptz,
  add column if not exists account_status_changed_by uuid
    references auth.users(id) on delete set null;

-- Index parcial: solo cuentas no-activas (las que el admin querría revisar)
create index if not exists idx_dj_profile_account_status
  on public.dj_profile(account_status)
  where account_status <> 'active';

-- ─── 2) Trigger anti-bypass ─────────────────────────────────────────
-- Revierte silenciosamente cualquier cambio a los campos de estado de
-- cuenta hecho por un rol distinto de service_role. Así el update normal
-- del perfil (bio, redes, etc.) sigue funcionando, pero un user no puede
-- auto-modificar su account_status.
create or replace function public.protect_account_status()
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

  -- service_role (backoffice admin) puede cambiar lo que quiera
  if caller_role = 'service_role' then
    return new;
  end if;

  -- Cualquier otro rol: si intenta tocar los campos de estado, revertir
  if new.account_status is distinct from old.account_status
     or new.account_status_reason is distinct from old.account_status_reason
     or new.account_status_changed_by is distinct from old.account_status_changed_by
     or new.account_status_changed_at is distinct from old.account_status_changed_at
  then
    new.account_status := old.account_status;
    new.account_status_reason := old.account_status_reason;
    new.account_status_changed_by := old.account_status_changed_by;
    new.account_status_changed_at := old.account_status_changed_at;
  end if;

  return new;
end;
$$;

-- CREATE TRIGGER no soporta IF NOT EXISTS, dropeamos primero (idempotente).
drop trigger if exists protect_account_status_trigger on public.dj_profile;

create trigger protect_account_status_trigger
  before update on public.dj_profile
  for each row
  execute function public.protect_account_status();

comment on function public.protect_account_status is
  'Migration 0030 — impide que un user cambie su propio account_status vía UPDATE directo. Solo service_role (backoffice) puede modificar el estado de cuenta.';

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0030 lista
-- ════════════════════════════════════════════════════════════════════
