-- 0019 · Sprint 21 — Operación del show
--
-- Tres bloques:
--   C1 · tech_rider_items (estructurado, reemplaza el campo libre tech_rider_ideal)
--   C2 · tracklists + tracklist_tracks (vinculadas a calendar_events)
--   C3 · dj_profile: auto-post webhook URL + toggle

------------------------------------------------------------
-- C1 · tech_rider_items
------------------------------------------------------------
-- Items del tech rider del DJ. Estructurado por categoría con cantidad
-- y equipo alternativo aceptable. Reemplaza el campo libre actual.
-- El campo `is_alternative` permite tener un "rider B" para clubes chicos.

create table if not exists public.tech_rider_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category      text not null check (category in (
    'reproduccion', 'mixer', 'monitores', 'power_cables',
    'hospitality', 'otros'
  )),
  name          text not null,
  quantity      int  not null default 1 check (quantity > 0),
  alt_text      text not null default '',
  note          text not null default '',
  sort_order    int  not null default 0,
  is_alternative boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tech_rider_items_user_cat
  on public.tech_rider_items (user_id, category, sort_order);

drop trigger if exists trg_tech_rider_items_updated_at on public.tech_rider_items;
create trigger trg_tech_rider_items_updated_at
  before update on public.tech_rider_items
  for each row execute function public.set_updated_at();

alter table public.tech_rider_items enable row level security;

drop policy if exists "tech_rider_items_select_own" on public.tech_rider_items;
create policy "tech_rider_items_select_own" on public.tech_rider_items
  for select using (auth.uid() = user_id);

drop policy if exists "tech_rider_items_insert_own" on public.tech_rider_items;
create policy "tech_rider_items_insert_own" on public.tech_rider_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "tech_rider_items_update_own" on public.tech_rider_items;
create policy "tech_rider_items_update_own" on public.tech_rider_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tech_rider_items_delete_own" on public.tech_rider_items;
create policy "tech_rider_items_delete_own" on public.tech_rider_items
  for delete using (auth.uid() = user_id);

-- También necesitamos que /p/[slug] (público) pueda leer el rider del DJ
-- para mostrarlo. Se hace via service_role en el server query, NO via RLS.

comment on table public.tech_rider_items is
  'Sprint 21 · Tech rider estructurado por DJ. Categorías + items + cantidades.';
comment on column public.tech_rider_items.is_alternative is
  'Si true, este item es parte del "rider alternativo" (clubes chicos).';

------------------------------------------------------------
-- C2 · tracklists
------------------------------------------------------------
-- Una tracklist por gig (calendar_event). Cardinalidad 1:1 conceptual:
-- un evento puede tener una tracklist. Si se borra el evento, conservamos
-- la tracklist (ON DELETE SET NULL) por si el user quiere mantenerla.

create table if not exists public.tracklists (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  calendar_event_id  uuid references public.calendar_events(id) on delete set null,
  title              text not null default '',
  -- Inicio/fin del set: si NULL, se infiere del calendar_event vinculado.
  started_at         timestamptz default null,
  ended_at           timestamptz default null,
  -- Notas internas (no exportadas)
  notes              text not null default '',
  -- KPIs calculados al guardar (se actualizan en server action)
  total_tracks       int not null default 0,
  duration_minutes   int default null,
  bpm_avg            numeric(5, 1) default null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_tracklists_user_event
  on public.tracklists (user_id, calendar_event_id);
create index if not exists idx_tracklists_user_at
  on public.tracklists (user_id, created_at desc);

-- Una sola tracklist por evento (UNIQUE parcial).
create unique index if not exists idx_tracklists_event_unique
  on public.tracklists (calendar_event_id)
  where calendar_event_id is not null;

drop trigger if exists trg_tracklists_updated_at on public.tracklists;
create trigger trg_tracklists_updated_at
  before update on public.tracklists
  for each row execute function public.set_updated_at();

alter table public.tracklists enable row level security;

drop policy if exists "tracklists_select_own" on public.tracklists;
create policy "tracklists_select_own" on public.tracklists
  for select using (auth.uid() = user_id);

drop policy if exists "tracklists_insert_own" on public.tracklists;
create policy "tracklists_insert_own" on public.tracklists
  for insert with check (auth.uid() = user_id);

drop policy if exists "tracklists_update_own" on public.tracklists;
create policy "tracklists_update_own" on public.tracklists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tracklists_delete_own" on public.tracklists;
create policy "tracklists_delete_own" on public.tracklists
  for delete using (auth.uid() = user_id);

comment on table public.tracklists is
  'Sprint 21 · Tracklist post-show vinculada a un calendar_event.';

------------------------------------------------------------
-- C2 · tracklist_tracks
------------------------------------------------------------

create table if not exists public.tracklist_tracks (
  id            uuid primary key default gen_random_uuid(),
  tracklist_id  uuid not null references public.tracklists(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  sort_order    int not null default 0,
  artist        text not null default '',
  title         text not null default '',
  label         text not null default '',
  bpm           numeric(5, 1) default null,
  music_key     text not null default '',  -- Camelot notation (1A-12B) u otros
  tag           text default null check (tag is null or tag in ('intro', 'peak', 'closer')),
  played_at     timestamptz default null,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists idx_tracklist_tracks_list
  on public.tracklist_tracks (tracklist_id, sort_order);
create index if not exists idx_tracklist_tracks_user
  on public.tracklist_tracks (user_id);

alter table public.tracklist_tracks enable row level security;

drop policy if exists "tracklist_tracks_select_own" on public.tracklist_tracks;
create policy "tracklist_tracks_select_own" on public.tracklist_tracks
  for select using (auth.uid() = user_id);

drop policy if exists "tracklist_tracks_insert_own" on public.tracklist_tracks;
create policy "tracklist_tracks_insert_own" on public.tracklist_tracks
  for insert with check (auth.uid() = user_id);

drop policy if exists "tracklist_tracks_update_own" on public.tracklist_tracks;
create policy "tracklist_tracks_update_own" on public.tracklist_tracks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "tracklist_tracks_delete_own" on public.tracklist_tracks;
create policy "tracklist_tracks_delete_own" on public.tracklist_tracks
  for delete using (auth.uid() = user_id);

comment on table public.tracklist_tracks is
  'Sprint 21 · Tracks individuales de una tracklist. Orden importa.';

------------------------------------------------------------
-- C3 · dj_profile: webhook genérico para auto-post
------------------------------------------------------------
-- Webhook URL genérico para integrar con Zapier/Make/n8n. Cuando el DJ
-- guarda una tracklist (o cualquier evento futuro que queramos),
-- DROP hace POST al webhook con JSON estructurado. El user decide qué
-- hace su Zap con esa data (postear a SC, X, Discord, mail, etc).

alter table public.dj_profile
  add column if not exists auto_post_webhook_url text default null;

alter table public.dj_profile
  add column if not exists auto_post_enabled boolean not null default false;

comment on column public.dj_profile.auto_post_webhook_url is
  'Sprint 21 · URL de webhook (Zapier/Make/n8n) que recibe el JSON al guardar tracklist.';
comment on column public.dj_profile.auto_post_enabled is
  'Si true y webhook_url presente, DROP hace POST al guardar tracklist.';
