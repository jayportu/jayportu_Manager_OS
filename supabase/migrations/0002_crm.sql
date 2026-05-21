-- ════════════════════════════════════════════════════════════════════
-- Migration 0002 — CRM (contacts + interactions + follow_ups)
-- ════════════════════════════════════════════════════════════════════

-- ─── Tabla: contacts ──────────────────────────────────────────────────
create table if not exists public.contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Identidad
  name            text not null,
  type            text not null default 'otro'
                  check (type in (
                    'club', 'bar', 'rooftop', 'productora', 'festival',
                    'booker', 'dj', 'productor_musical', 'marca',
                    'cliente_evento_privado', 'promotor', 'fan_seguidor', 'otro'
                  )),

  -- Ubicación
  city            text default '',
  country         text default 'Chile',

  -- Canales
  instagram       text default '',
  whatsapp        text default '',
  email           text default '',
  website         text default '',

  -- Persona de contacto (en clubs/productoras)
  contact_person  text default '',
  contact_role    text default '',

  -- Pipeline
  music_style     text default '',
  main_channel    text default 'whatsapp'
                  check (main_channel in (
                    'whatsapp', 'email', 'instagram', 'presencial', 'otro'
                  )),
  status          text not null default 'nuevo'
                  check (status in (
                    'nuevo', 'contactado', 'respondio', 'interesado',
                    'propuesta_enviada', 'negociando', 'confirmado',
                    'realizado', 'perdido', 'recontactar_despues', 'ignorar'
                  )),
  score           int default 50 check (score >= 0 and score <= 100),
  score_reason    text default '',
  source          text default 'manual',

  -- Tiempos
  last_contact_at   timestamptz,
  next_followup_at  timestamptz,

  -- Notas libres
  notes           text default '',

  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_contacts_user_id      on public.contacts(user_id);
create index if not exists idx_contacts_status       on public.contacts(user_id, status);
create index if not exists idx_contacts_type         on public.contacts(user_id, type);
create index if not exists idx_contacts_score        on public.contacts(user_id, score desc);
create index if not exists idx_contacts_next_fu      on public.contacts(user_id, next_followup_at)
  where next_followup_at is not null;

drop trigger if exists trg_contacts_updated_at on public.contacts;
create trigger trg_contacts_updated_at
  before update on public.contacts
  for each row execute function public.set_updated_at();

-- RLS
alter table public.contacts enable row level security;

drop policy if exists "contacts_select_own" on public.contacts;
create policy "contacts_select_own" on public.contacts
  for select using (auth.uid() = user_id);

drop policy if exists "contacts_insert_own" on public.contacts;
create policy "contacts_insert_own" on public.contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists "contacts_update_own" on public.contacts;
create policy "contacts_update_own" on public.contacts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "contacts_delete_own" on public.contacts;
create policy "contacts_delete_own" on public.contacts
  for delete using (auth.uid() = user_id);


-- ─── Tabla: interactions ──────────────────────────────────────────────
-- Timeline manual de interacciones por contacto.
-- Reemplaza el "inbox WhatsApp" — Jaime registra a mano tras chatear.
create table if not exists public.interactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  contact_id    uuid not null references public.contacts(id) on delete cascade,

  channel       text not null default 'whatsapp'
                check (channel in (
                  'whatsapp', 'email', 'instagram', 'llamada', 'presencial',
                  'sms', 'otro'
                )),
  direction     text not null default 'out'
                check (direction in ('in', 'out')),

  note          text not null default '',

  happened_at   timestamptz not null default now(),
  created_via   text default 'manual', -- manual | from_template | imported

  created_at    timestamptz not null default now()
);

create index if not exists idx_interactions_contact      on public.interactions(contact_id, happened_at desc);
create index if not exists idx_interactions_user         on public.interactions(user_id, happened_at desc);

-- RLS
alter table public.interactions enable row level security;

drop policy if exists "interactions_select_own" on public.interactions;
create policy "interactions_select_own" on public.interactions
  for select using (auth.uid() = user_id);

drop policy if exists "interactions_insert_own" on public.interactions;
create policy "interactions_insert_own" on public.interactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "interactions_update_own" on public.interactions;
create policy "interactions_update_own" on public.interactions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "interactions_delete_own" on public.interactions;
create policy "interactions_delete_own" on public.interactions
  for delete using (auth.uid() = user_id);


-- ─── Trigger: registrar interacción → actualizar last_contact_at del contacto
create or replace function public.bump_contact_last_contact()
returns trigger
language plpgsql
as $$
begin
  update public.contacts
    set last_contact_at = greatest(coalesce(last_contact_at, 'epoch'::timestamptz), new.happened_at)
  where id = new.contact_id;
  return new;
end;
$$;

drop trigger if exists trg_interactions_bump_contact on public.interactions;
create trigger trg_interactions_bump_contact
  after insert on public.interactions
  for each row execute function public.bump_contact_last_contact();


-- ─── Tabla: follow_ups ────────────────────────────────────────────────
-- Recordatorios "hay que hacer X con este contacto el día Y".
create table if not exists public.follow_ups (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  contact_id    uuid not null references public.contacts(id) on delete cascade,

  due_at        timestamptz not null,
  note          text default '',
  priority      text default 'normal'
                check (priority in ('alta', 'normal', 'baja')),

  done          boolean not null default false,
  done_at       timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_follow_ups_user_due   on public.follow_ups(user_id, due_at)
  where done = false;
create index if not exists idx_follow_ups_contact    on public.follow_ups(contact_id, due_at);

drop trigger if exists trg_follow_ups_updated_at on public.follow_ups;
create trigger trg_follow_ups_updated_at
  before update on public.follow_ups
  for each row execute function public.set_updated_at();

-- RLS
alter table public.follow_ups enable row level security;

drop policy if exists "follow_ups_select_own" on public.follow_ups;
create policy "follow_ups_select_own" on public.follow_ups
  for select using (auth.uid() = user_id);

drop policy if exists "follow_ups_insert_own" on public.follow_ups;
create policy "follow_ups_insert_own" on public.follow_ups
  for insert with check (auth.uid() = user_id);

drop policy if exists "follow_ups_update_own" on public.follow_ups;
create policy "follow_ups_update_own" on public.follow_ups
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "follow_ups_delete_own" on public.follow_ups;
create policy "follow_ups_delete_own" on public.follow_ups
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0002 lista (contacts + interactions + follow_ups)
-- ════════════════════════════════════════════════════════════════════
