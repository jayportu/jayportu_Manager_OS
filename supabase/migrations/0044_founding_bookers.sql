-- ════════════════════════════════════════════════════════════════════
-- Migration 0044 — Founding Bookers (Fase 2 · última pieza)
-- ────────────────────────────────────────────────────────────────────
-- Programa VIP curado de bookers. Como el signup booker ya está ABIERTO,
-- "Founding" no gatea acceso: es status (badge ★ Founding + auto-verificado
-- + flag listo para perks futuros: gratis/acceso anticipado cuando los
-- features de booker sean pagos, Fase 3).
--
-- Acquisition vía invitación con TOKEN ÚNICO DE UN SOLO USO (mirror de la
-- beta de DJs, beta_requests/0020): el admin invita por email → token →
-- al registrarse (o en su próxima visita a /booker) el consumo auto-marca
-- is_founding + verifica e invalida el token (single-use).
--
-- 1) is_founding + founding_since en booker_accounts (protegidos por el
--    trigger existente protect_booker_verification, extendido acá).
-- 2) Tabla founding_invites (token single-use).
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0044_founding_bookers.sql
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Columnas Founding en booker_accounts ───────────────────────────
alter table public.booker_accounts
  add column if not exists is_founding boolean not null default false,
  add column if not exists founding_since timestamptz default null;

-- ─── 2) Extender el trigger anti-tampering (0032) para is_founding ──────
-- Un booker edita su propio booker_accounts vía RLS → sin esto podría
-- auto-marcarse Founding. Solo service_role (backoffice / consumo de invite).
create or replace function public.protect_booker_verification()
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

  -- service_role (backoffice admin / consumo de invite) puede todo
  if caller_role = 'service_role' then
    return new;
  end if;

  -- Verificación (0032)
  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
  then
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;

  -- Founding (0044)
  if new.is_founding is distinct from old.is_founding
     or new.founding_since is distinct from old.founding_since
  then
    new.is_founding := old.is_founding;
    new.founding_since := old.founding_since;
  end if;

  return new;
end;
$$;

comment on function public.protect_booker_verification is
  'Migration 0032+0044 — impide auto-setear verified_* e is_founding/founding_since vía UPDATE directo. Solo service_role (backoffice / consumo de invite Founding).';

-- ─── 3) Tabla de invitaciones Founding (token single-use) ───────────────
create table if not exists public.founding_invites (
  id               uuid primary key default gen_random_uuid(),
  email            text not null,
  full_name        text not null default '',
  invite_token     uuid default null,
  status           text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  invite_sent_at   timestamptz default null,
  accepted_at      timestamptz default null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  invited_by       uuid references auth.users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- token único mientras no se consuma (single-use: se setea null al aceptar)
create unique index if not exists founding_invites_token_idx
  on public.founding_invites (invite_token) where invite_token is not null;

-- a lo más un invite PENDIENTE por email (no duplicar invitaciones activas)
create unique index if not exists founding_invites_email_pending_idx
  on public.founding_invites (lower(email)) where status = 'pending';

alter table public.founding_invites enable row level security;

drop policy if exists "founding_invites_admin_all" on public.founding_invites;
create policy "founding_invites_admin_all" on public.founding_invites
  for all using (
    exists (
      select 1 from public.dj_profile
      where user_id = auth.uid() and is_admin = true
    )
  );

comment on table public.founding_invites is
  'Migration 0044 — invitaciones VIP a Founding Bookers. Token único de un solo uso (invalidado al consumir). Mirror de beta_requests para el lado booker.';
