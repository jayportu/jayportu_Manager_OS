-- ════════════════════════════════════════════════════════════════════
-- Migration 0013 — push_subscriptions
-- ────────────────────────────────────────────────────────────────────
-- Almacena las subscripciones Web Push del navegador. Cada usuario
-- puede tener varias (1 por dispositivo/browser).
--
-- Endpoint + p256dh + auth son los datos que devuelve
-- PushSubscription.toJSON() en el cliente y que el servidor necesita
-- para enviar push via web-push (VAPID).
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Datos de la subscription (Web Push API)
  endpoint      text not null,
  p256dh        text not null,
  auth          text not null,

  -- Metadata
  user_agent    text default '',
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  last_error    text,

  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- ─── RLS ──────────────────────────────────────────────────────────────
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subs_select_own" on public.push_subscriptions;
create policy "push_subs_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "push_subs_insert_own" on public.push_subscriptions;
create policy "push_subs_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_subs_update_own" on public.push_subscriptions;
create policy "push_subs_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "push_subs_delete_own" on public.push_subscriptions;
create policy "push_subs_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0013 lista
-- ════════════════════════════════════════════════════════════════════
