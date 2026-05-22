-- ════════════════════════════════════════════════════════════════════
-- Migration 0011 — Platform accounts (auto-sync de snapshots)
-- ════════════════════════════════════════════════════════════════════
-- Permite registrar usernames externos (SC, Mixcloud, etc.) para que
-- snapshots se actualicen solos vía cron, sin entrar a mano cada vez.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.platform_accounts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  platform            text not null
                      check (platform in (
                        'instagram', 'youtube', 'soundcloud',
                        'tiktok', 'twitter', 'facebook', 'mixcloud', 'otro'
                      )),
  username            text not null,           -- handle público (ej: "jay_portu")
  external_id         text,                    -- id numérico cuando se conozca
  auto_sync_enabled   boolean not null default true,

  last_synced_at      timestamptz,
  last_error          text,
  last_followers      int,
  last_track_count    int,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (user_id, platform)
);

create index if not exists idx_platform_accounts_user
  on public.platform_accounts(user_id);

create index if not exists idx_platform_accounts_auto
  on public.platform_accounts(auto_sync_enabled)
  where auto_sync_enabled = true;

-- updated_at trigger
create or replace function public.tg_platform_accounts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_platform_accounts_updated_at on public.platform_accounts;
create trigger trg_platform_accounts_updated_at
  before update on public.platform_accounts
  for each row execute function public.tg_platform_accounts_updated_at();

-- RLS
alter table public.platform_accounts enable row level security;

drop policy if exists "own_platform_accounts_select" on public.platform_accounts;
create policy "own_platform_accounts_select" on public.platform_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "own_platform_accounts_insert" on public.platform_accounts;
create policy "own_platform_accounts_insert" on public.platform_accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_platform_accounts_update" on public.platform_accounts;
create policy "own_platform_accounts_update" on public.platform_accounts
  for update using (auth.uid() = user_id);

drop policy if exists "own_platform_accounts_delete" on public.platform_accounts;
create policy "own_platform_accounts_delete" on public.platform_accounts
  for delete using (auth.uid() = user_id);

-- ─── source en platform_snapshots ───────────────────────────────────
-- Distingue snapshots manuales (UI) de automáticos (cron). El cron
-- ignora snapshots manuales recientes, y la UI muestra badge "auto".
alter table public.platform_snapshots
  add column if not exists source text not null default 'manual'
  check (source in ('manual', 'auto'));

create index if not exists idx_platform_snapshots_user_platform_date
  on public.platform_snapshots(user_id, platform, snapshot_at desc);
