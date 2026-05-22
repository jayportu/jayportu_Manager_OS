-- ════════════════════════════════════════════════════════════════════
-- Migration 0007 — Calendar events (espejo de Google Calendar)
-- ════════════════════════════════════════════════════════════════════
-- Guardamos local cada evento creado/sincronizado de Google Calendar
-- para vinculación con contacts/opportunities y queries rápidas.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.calendar_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- Vínculo con Google Calendar
  google_event_id   text,        -- null si solo es local (futuro: drafts)
  google_calendar_id text default 'primary',

  -- Identidad del evento
  type              text not null default 'show'
                    check (type in (
                      'show',         -- gig confirmado
                      'reunion',      -- meeting
                      'follow_up',    -- recordatorio
                      'bloqueo',      -- bloqueo disponibilidad
                      'contenido',    -- grabar/editar
                      'otro'
                    )),
  title             text not null,
  description       text default '',
  location          text default '',

  -- Tiempo
  start_at          timestamptz not null,
  end_at            timestamptz not null,
  all_day           boolean not null default false,

  -- Vínculos opcionales con CRM
  contact_id        uuid references public.contacts(id) on delete set null,

  -- Estado de sincronización
  sync_state        text not null default 'synced'
                    check (sync_state in (
                      'synced',       -- en Google + DB OK
                      'local_only',   -- creado local, no en Google
                      'pending_sync', -- modificado local, hay que pushear
                      'pending_pull', -- existe en Google, hay que jalar updates
                      'error'
                    )),
  last_synced_at    timestamptz,

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  unique (user_id, google_event_id)
);

create index if not exists idx_calendar_events_user_start
  on public.calendar_events(user_id, start_at);
create index if not exists idx_calendar_events_contact
  on public.calendar_events(contact_id, start_at)
  where contact_id is not null;
create index if not exists idx_calendar_events_type
  on public.calendar_events(user_id, type, start_at);

drop trigger if exists trg_calendar_events_updated_at on public.calendar_events;
create trigger trg_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- RLS
alter table public.calendar_events enable row level security;

drop policy if exists "calendar_events_select_own" on public.calendar_events;
create policy "calendar_events_select_own" on public.calendar_events
  for select using (auth.uid() = user_id);

drop policy if exists "calendar_events_insert_own" on public.calendar_events;
create policy "calendar_events_insert_own" on public.calendar_events
  for insert with check (auth.uid() = user_id);

drop policy if exists "calendar_events_update_own" on public.calendar_events;
create policy "calendar_events_update_own" on public.calendar_events
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendar_events_delete_own" on public.calendar_events;
create policy "calendar_events_delete_own" on public.calendar_events
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0007 lista
-- ════════════════════════════════════════════════════════════════════
