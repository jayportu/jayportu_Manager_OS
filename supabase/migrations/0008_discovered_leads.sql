-- ════════════════════════════════════════════════════════════════════
-- Migration 0008 — Discovered Leads (pre-CRM)
-- ════════════════════════════════════════════════════════════════════
-- Leads encontrados por OSM/manual/CSV/IA antes de promoverlos al CRM.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.discovered_leads (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,

  -- Identidad
  name                  text not null,
  type                  text not null default 'otro'
                        check (type in (
                          'club', 'bar', 'rooftop', 'productora', 'festival',
                          'booker', 'dj', 'productor_musical', 'marca',
                          'cliente_evento_privado', 'promotor', 'fan_seguidor', 'otro'
                        )),

  -- Ubicación
  city                  text default '',
  country               text default 'Chile',
  address               text default '',
  lat                   double precision,
  lng                   double precision,

  -- Canales
  instagram             text default '',
  whatsapp              text default '',
  email                 text default '',
  website               text default '',
  phone                 text default '',

  -- Source / origen
  source                text not null default 'manual'
                        check (source in (
                          'overpass', 'manual_text', 'csv', 'ai_extracted',
                          'gmail_thread'
                        )),
  source_id             text default '',         -- OSM ID, etc.
  source_query          text default '',         -- query original
  raw_data              jsonb default '{}'::jsonb,

  -- Enriquecimiento IA
  ai_summary            text default '',
  ai_score              int,
  ai_score_reason       text default '',
  music_style_guess     text default '',
  action_recommended    text default '',

  -- Estado
  status                text not null default 'new'
                        check (status in (
                          'new', 'reviewed', 'added_to_crm', 'dismissed', 'ignored'
                        )),
  promoted_contact_id   uuid references public.contacts(id) on delete set null,

  -- Notas libres del user
  notes                 text default '',

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- Para evitar duplicados de la misma fuente
  unique (user_id, source, source_id)
);

create index if not exists idx_discovered_leads_user_status
  on public.discovered_leads(user_id, status, created_at desc);
create index if not exists idx_discovered_leads_type
  on public.discovered_leads(user_id, type, status);

drop trigger if exists trg_discovered_leads_updated_at on public.discovered_leads;
create trigger trg_discovered_leads_updated_at
  before update on public.discovered_leads
  for each row execute function public.set_updated_at();

-- RLS
alter table public.discovered_leads enable row level security;

drop policy if exists "discovered_leads_select_own" on public.discovered_leads;
create policy "discovered_leads_select_own" on public.discovered_leads
  for select using (auth.uid() = user_id);

drop policy if exists "discovered_leads_insert_own" on public.discovered_leads;
create policy "discovered_leads_insert_own" on public.discovered_leads
  for insert with check (auth.uid() = user_id);

drop policy if exists "discovered_leads_update_own" on public.discovered_leads;
create policy "discovered_leads_update_own" on public.discovered_leads
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "discovered_leads_delete_own" on public.discovered_leads;
create policy "discovered_leads_delete_own" on public.discovered_leads
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0008 lista
-- ════════════════════════════════════════════════════════════════════
