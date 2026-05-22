-- ════════════════════════════════════════════════════════════════════
-- Migration 0006 — Gmail integration
-- ════════════════════════════════════════════════════════════════════
-- gmail_connections: tokens OAuth de Gmail (1 por user)
-- gmail_threads_cache: metadata de hilos asociados a contactos
-- ════════════════════════════════════════════════════════════════════

-- ─── gmail_connections ───────────────────────────────────────────────
create table if not exists public.gmail_connections (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  google_email      text not null,
  access_token      text not null,
  refresh_token     text not null,
  scope             text not null default '',
  token_type        text not null default 'Bearer',
  expires_at        timestamptz not null,
  last_sync_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists trg_gmail_connections_updated_at on public.gmail_connections;
create trigger trg_gmail_connections_updated_at
  before update on public.gmail_connections
  for each row execute function public.set_updated_at();

alter table public.gmail_connections enable row level security;

drop policy if exists "gmail_select_own" on public.gmail_connections;
create policy "gmail_select_own" on public.gmail_connections
  for select using (auth.uid() = user_id);

drop policy if exists "gmail_insert_own" on public.gmail_connections;
create policy "gmail_insert_own" on public.gmail_connections
  for insert with check (auth.uid() = user_id);

drop policy if exists "gmail_update_own" on public.gmail_connections;
create policy "gmail_update_own" on public.gmail_connections
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "gmail_delete_own" on public.gmail_connections;
create policy "gmail_delete_own" on public.gmail_connections
  for delete using (auth.uid() = user_id);


-- ─── gmail_threads_cache ─────────────────────────────────────────────
create table if not exists public.gmail_threads_cache (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  thread_id       text not null,
  contact_id      uuid references public.contacts(id) on delete set null,

  -- Metadata del hilo (snapshot, no autoritativo)
  subject         text default '',
  snippet         text default '',
  from_email      text default '',
  from_name       text default '',
  to_emails       text default '',
  messages_count  int default 0,
  last_message_at timestamptz,

  -- Resumen IA (opcional)
  ai_summary      text default '',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (user_id, thread_id)
);

create index if not exists idx_gmail_threads_user_at
  on public.gmail_threads_cache(user_id, last_message_at desc);
create index if not exists idx_gmail_threads_contact
  on public.gmail_threads_cache(contact_id, last_message_at desc)
  where contact_id is not null;

drop trigger if exists trg_gmail_threads_updated_at on public.gmail_threads_cache;
create trigger trg_gmail_threads_updated_at
  before update on public.gmail_threads_cache
  for each row execute function public.set_updated_at();

alter table public.gmail_threads_cache enable row level security;

drop policy if exists "gmail_threads_select_own" on public.gmail_threads_cache;
create policy "gmail_threads_select_own" on public.gmail_threads_cache
  for select using (auth.uid() = user_id);

drop policy if exists "gmail_threads_insert_own" on public.gmail_threads_cache;
create policy "gmail_threads_insert_own" on public.gmail_threads_cache
  for insert with check (auth.uid() = user_id);

drop policy if exists "gmail_threads_update_own" on public.gmail_threads_cache;
create policy "gmail_threads_update_own" on public.gmail_threads_cache
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "gmail_threads_delete_own" on public.gmail_threads_cache;
create policy "gmail_threads_delete_own" on public.gmail_threads_cache
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0006 lista
-- ════════════════════════════════════════════════════════════════════
