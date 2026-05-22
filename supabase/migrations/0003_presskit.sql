-- ════════════════════════════════════════════════════════════════════
-- Migration 0003 — Press kit público (slug + tracking + bookings)
-- ════════════════════════════════════════════════════════════════════

-- ─── dj_profile.public_slug ───────────────────────────────────────────
alter table public.dj_profile
  add column if not exists public_slug text;

-- Backfill: slug derivado del artist_name (lowercase + guiones).
-- Fallback: 'jay-' + 8 primeros chars del user_id, para que ningún user
-- quede sin slug.
update public.dj_profile
set public_slug = coalesce(
  nullif(
    trim(both '-' from regexp_replace(lower(trim(artist_name)), '[^a-z0-9]+', '-', 'g')),
    ''
  ),
  'jay-' || substring(user_id::text, 1, 8)
)
where public_slug is null or public_slug = '';

-- Unique
alter table public.dj_profile
  drop constraint if exists dj_profile_public_slug_unique;
alter table public.dj_profile
  add constraint dj_profile_public_slug_unique unique (public_slug);

-- Trigger: cuando se actualiza artist_name, regenerar slug si quedó vacío
create or replace function public.ensure_public_slug()
returns trigger
language plpgsql
as $$
begin
  if new.public_slug is null or new.public_slug = '' then
    new.public_slug := coalesce(
      nullif(
        trim(both '-' from regexp_replace(lower(trim(new.artist_name)), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'jay-' || substring(new.user_id::text, 1, 8)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dj_profile_ensure_slug on public.dj_profile;
create trigger trg_dj_profile_ensure_slug
  before insert or update on public.dj_profile
  for each row execute function public.ensure_public_slug();


-- ─── Tabla: presskit_events ───────────────────────────────────────────
-- Tracking propio de visitas y clicks en el press kit público.
-- Insert público (anyone can write via service_role en server route).
-- Select solo el owner.
create table if not exists public.presskit_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  event         text not null
                check (event in (
                  'view',
                  'click_whatsapp',
                  'click_email',
                  'click_instagram',
                  'click_soundcloud',
                  'click_youtube',
                  'click_spotify',
                  'click_website',
                  'click_tech_rider',
                  'form_open',
                  'form_submit'
                )),

  referrer      text default '',
  user_agent    text default '',
  country       text default '',
  metadata      jsonb default '{}'::jsonb,

  created_at    timestamptz not null default now()
);

create index if not exists idx_presskit_events_user_at
  on public.presskit_events(user_id, created_at desc);
create index if not exists idx_presskit_events_event_at
  on public.presskit_events(user_id, event, created_at desc);

-- RLS
alter table public.presskit_events enable row level security;

drop policy if exists "presskit_events_select_own" on public.presskit_events;
create policy "presskit_events_select_own" on public.presskit_events
  for select using (auth.uid() = user_id);

-- No hay policy de insert/update/delete — esos van vía service_role
-- desde /api/track (server-side, autenticación no requerida del usuario web).


-- ─── Tabla: booking_form_submissions ──────────────────────────────────
create table if not exists public.booking_form_submissions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- Datos del formulario
  name                text not null,
  email               text default '',
  phone               text default '',
  event_type          text default '',
  event_date          date,
  venue               text default '',
  message             text default '',

  -- Procesamiento
  status              text not null default 'pendiente'
                      check (status in (
                        'pendiente', 'leido', 'respondido', 'convertido', 'descartado'
                      )),
  created_contact_id  uuid references public.contacts(id) on delete set null,

  -- Tracking origen
  referrer            text default '',
  user_agent          text default '',

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_bookings_user_at
  on public.booking_form_submissions(user_id, created_at desc);
create index if not exists idx_bookings_status
  on public.booking_form_submissions(user_id, status, created_at desc);

drop trigger if exists trg_bookings_updated_at on public.booking_form_submissions;
create trigger trg_bookings_updated_at
  before update on public.booking_form_submissions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.booking_form_submissions enable row level security;

drop policy if exists "bookings_select_own" on public.booking_form_submissions;
create policy "bookings_select_own" on public.booking_form_submissions
  for select using (auth.uid() = user_id);

drop policy if exists "bookings_update_own" on public.booking_form_submissions;
create policy "bookings_update_own" on public.booking_form_submissions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "bookings_delete_own" on public.booking_form_submissions;
create policy "bookings_delete_own" on public.booking_form_submissions
  for delete using (auth.uid() = user_id);

-- Inserts también vía service_role desde server (form público).


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0003 lista
-- ════════════════════════════════════════════════════════════════════
