-- ════════════════════════════════════════════════════════════════════
-- Migration 0075 — user_consents (registro append-only de consentimientos)
-- ────────────────────────────────────────────────────────────────────
-- Track legal (BL-08): las columnas tos_accepted_at/tos_version (dj_profile /
-- booker_accounts) guardan SOLO el último consentimiento. Esta tabla registra
-- CADA aceptación como una fila inmutable, con versión + fecha + IP + user-agent
-- + origen — más defendible ante la Ley 21.719 (histórico, múltiples
-- finalidades, evidencia de contexto).
--
-- Append-only: RLS permite INSERT y SELECT propios; NO hay policies de
-- UPDATE/DELETE → quedan denegadas para el rol authenticated. service_role
-- puede corregir (bypass) si hiciera falta.
--
-- La app la escribe desde el servidor (ensureBookerAccount / acceptBookerTos)
-- con el client user-scoped (RLS insert_own). NO reemplaza a tos_* todavía;
-- corre en paralelo.
--
-- Idempotente. Aditiva. Ejecutar en: Supabase Dashboard → SQL Editor.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.user_consents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  doc_type     text not null default 'tos_privacy',
  version      text not null,
  source       text not null default '',
  ip           text,
  user_agent   text,
  accepted_at  timestamptz not null default now()
);

create index if not exists user_consents_user_idx
  on public.user_consents (user_id, accepted_at desc);

alter table public.user_consents enable row level security;

-- Append-only: solo insert-own + select-own (sin update/delete).
drop policy if exists user_consents_insert_own on public.user_consents;
create policy user_consents_insert_own on public.user_consents
  for insert with check (auth.uid() = user_id);

drop policy if exists user_consents_select_own on public.user_consents;
create policy user_consents_select_own on public.user_consents
  for select using (auth.uid() = user_id);

-- Admin (dj_profile.is_admin) puede leer todo para auditoría.
drop policy if exists user_consents_admin_select on public.user_consents;
create policy user_consents_admin_select on public.user_consents
  for select using (
    exists (
      select 1 from public.dj_profile p
      where p.user_id = auth.uid() and p.is_admin = true
    )
  );

comment on table public.user_consents is
  'BL-08 — registro append-only de consentimientos (ToS/Privacidad): 1 fila inmutable por aceptación, con versión/fecha/IP/UA/origen. RLS: insert+select propios; sin update/delete (append-only). Complementa tos_accepted_at/tos_version.';

-- ─── Verificación ────────────────────────────────────────────────────────────
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='user_consents';
-- select policyname, cmd from pg_policies
--  where schemaname='public' and tablename='user_consents';
-- Tras un signup nuevo de booker: debe aparecer 1 fila con source='signup_booker'.

-- ─── Reversión ───────────────────────────────────────────────────────────────
-- drop table if exists public.user_consents;

-- ✓ Migration 0075 lista
