-- ════════════════════════════════════════════════════════════════════
-- Migration 0069 — Convocatorias (open_gigs + gig_applications) · Fase 8
-- ────────────────────────────────────────────────────────────────────
-- Marketplace "postular a un gig": booker verificado publica open_gigs,
-- DJs postulan (gig_applications). Denormalizamos nombres porque la RLS
-- de booker_accounts/contacts impide lecturas cruzadas.
-- Ejecutar en: Supabase Dashboard → SQL Editor. Aditiva.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.open_gigs (
  id                   uuid primary key default gen_random_uuid(),
  booker_user_id       uuid not null references auth.users(id) on delete cascade,
  organizer_name       text not null default '',
  title                text not null,
  event_date           date,
  city                 text not null default '',
  country              text not null default '',
  genre                text not null default '',
  budget_clp           int,
  description          text not null default '',
  application_deadline date,
  status               text not null default 'open' check (status in ('open','closed')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_open_gigs_discovery on public.open_gigs(status, city, event_date);
create index if not exists idx_open_gigs_booker on public.open_gigs(booker_user_id, created_at desc);

alter table public.open_gigs enable row level security;

drop policy if exists open_gigs_select on public.open_gigs;
create policy open_gigs_select on public.open_gigs
  for select using (status = 'open' or auth.uid() = booker_user_id);

drop policy if exists open_gigs_insert on public.open_gigs;
create policy open_gigs_insert on public.open_gigs
  for insert with check (auth.uid() = booker_user_id);

drop policy if exists open_gigs_update on public.open_gigs;
create policy open_gigs_update on public.open_gigs
  for update using (auth.uid() = booker_user_id) with check (auth.uid() = booker_user_id);

drop policy if exists open_gigs_delete on public.open_gigs;
create policy open_gigs_delete on public.open_gigs
  for delete using (auth.uid() = booker_user_id);

-- ── gig_applications ────────────────────────────────────────────────
create table if not exists public.gig_applications (
  id              uuid primary key default gen_random_uuid(),
  open_gig_id     uuid not null references public.open_gigs(id) on delete cascade,
  dj_user_id      uuid not null references auth.users(id) on delete cascade,
  dj_display_name text not null default '',
  dj_slug         text not null default '',
  message         text not null default '',
  availability    text not null default '',
  status          text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at      timestamptz not null default now(),
  viewed_at       timestamptz,
  unique (open_gig_id, dj_user_id)
);

create index if not exists idx_gig_apps_gig on public.gig_applications(open_gig_id, created_at desc);
create index if not exists idx_gig_apps_dj on public.gig_applications(dj_user_id, created_at desc);

alter table public.gig_applications enable row level security;

-- El DJ dueño o el booker dueño del gig
drop policy if exists gig_apps_select on public.gig_applications;
create policy gig_apps_select on public.gig_applications
  for select using (
    auth.uid() = dj_user_id
    or exists (select 1 from public.open_gigs g
               where g.id = open_gig_id and g.booker_user_id = auth.uid())
  );

drop policy if exists gig_apps_insert on public.gig_applications;
create policy gig_apps_insert on public.gig_applications
  for insert with check (auth.uid() = dj_user_id);

-- El booker dueño del gig marca viewed_at / status
drop policy if exists gig_apps_update_booker on public.gig_applications;
create policy gig_apps_update_booker on public.gig_applications
  for update using (
    exists (select 1 from public.open_gigs g
            where g.id = open_gig_id and g.booker_user_id = auth.uid())
  );

drop policy if exists gig_apps_delete_dj on public.gig_applications;
create policy gig_apps_delete_dj on public.gig_applications
  for delete using (auth.uid() = dj_user_id);

-- ✓ Migration 0069 lista
