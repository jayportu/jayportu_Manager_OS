-- ════════════════════════════════════════════════════════════════════
-- Migration 0063 — account status para BOOKERS (suspender / banear)
-- ────────────────────────────────────────────────────────────────────
-- Espejo de la 0030 (que hizo esto para dj_profile). Hasta ahora los
-- bookers NO se podían moderar: booker_accounts no tenía account_status
-- y el gating de (app)/layout solo miraba dj_profile. Esto los hace
-- suspendibles/baneables por el admin, igual que los DJs.
--
-- Estados: 'active' (default) · 'suspended' (temporal) · 'banned' (perm).
-- El gating vive en src/app/booker/layout.tsx: un booker suspended|banned
-- (no admin) es redirigido a /cuenta-suspendida.
--
-- SEGURIDAD: un booker puede editar su propio booker_account (bio, redes)
-- vía RLS. Sin protección, un booker suspendido podría UPDATE directo a
-- account_status='active' y bypassear el bloqueo. El trigger
-- protect_booker_account_status() revierte cualquier cambio a los campos
-- de estado hecho por un rol que NO sea service_role.
--
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0063_booker_account_status.sql
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Columnas ────────────────────────────────────────────────────
alter table public.booker_accounts
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'banned')),
  add column if not exists account_status_reason text,
  add column if not exists account_status_changed_at timestamptz,
  add column if not exists account_status_changed_by uuid
    references auth.users(id) on delete set null;

create index if not exists idx_booker_accounts_account_status
  on public.booker_accounts(account_status)
  where account_status <> 'active';

-- ─── 2) Trigger anti-bypass ─────────────────────────────────────────
create or replace function public.protect_booker_account_status()
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

drop trigger if exists protect_booker_account_status_trigger on public.booker_accounts;

create trigger protect_booker_account_status_trigger
  before update on public.booker_accounts
  for each row
  execute function public.protect_booker_account_status();

comment on function public.protect_booker_account_status is
  'Migration 0063 — impide que un booker cambie su propio account_status vía UPDATE directo. Solo service_role (backoffice) puede.';

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0063 lista
-- ════════════════════════════════════════════════════════════════════
