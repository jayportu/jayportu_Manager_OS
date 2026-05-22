-- ════════════════════════════════════════════════════════════════════
-- Migration 0009 — Campaigns
-- ════════════════════════════════════════════════════════════════════
-- Una campaña = un esfuerzo de outreach a un grupo de contactos.
-- Se modela con dos tablas: campaigns (la iniciativa) +
-- campaign_contacts (m2m con estado por contacto).
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.campaigns (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  -- Identidad
  name            text not null,
  goal            text default '',
  channel         text not null default 'whatsapp'
                  check (channel in (
                    'whatsapp', 'email', 'instagram', 'mixto', 'otro'
                  )),

  -- Estado de la campaña
  status          text not null default 'active'
                  check (status in (
                    'draft', 'active', 'paused', 'done', 'archived'
                  )),

  -- Mensaje base (puede ser plantilla referenciada o texto libre)
  template_id     uuid references public.templates(id) on delete set null,
  message_base   text default '',

  -- Tiempos
  started_at      timestamptz default now(),
  ended_at        timestamptz,

  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_campaigns_user_status
  on public.campaigns(user_id, status, created_at desc);

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

drop policy if exists "campaigns_select_own" on public.campaigns;
create policy "campaigns_select_own" on public.campaigns
  for select using (auth.uid() = user_id);

drop policy if exists "campaigns_insert_own" on public.campaigns;
create policy "campaigns_insert_own" on public.campaigns
  for insert with check (auth.uid() = user_id);

drop policy if exists "campaigns_update_own" on public.campaigns;
create policy "campaigns_update_own" on public.campaigns
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "campaigns_delete_own" on public.campaigns;
create policy "campaigns_delete_own" on public.campaigns
  for delete using (auth.uid() = user_id);


-- ─── campaign_contacts (m2m con estado) ───────────────────────────────
create table if not exists public.campaign_contacts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  campaign_id     uuid not null references public.campaigns(id) on delete cascade,
  contact_id      uuid not null references public.contacts(id) on delete cascade,

  status          text not null default 'pendiente'
                  check (status in (
                    'pendiente',          -- no se ha contactado aún
                    'preparado',          -- mensaje preparado, pendiente de envío
                    'enviado',            -- mensaje enviado
                    'respondio',          -- respondió (sin clasificar interés)
                    'interesado',         -- respondió y está interesado
                    'no_respondio',       -- enviado, sin respuesta tras tiempo
                    'seguimiento_pendiente',
                    'convertido',         -- convertido en oportunidad / show confirmado
                    'cerrado',            -- ciclo cerrado (no avanzó)
                    'descartado'          -- no perseguir
                  )),

  -- Tracking
  contacted_at    timestamptz,
  response_at     timestamptz,
  last_message    text default '',
  notes           text default '',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (campaign_id, contact_id)
);

create index if not exists idx_cc_user_campaign
  on public.campaign_contacts(user_id, campaign_id);
create index if not exists idx_cc_status
  on public.campaign_contacts(user_id, campaign_id, status);
create index if not exists idx_cc_contact
  on public.campaign_contacts(contact_id);

drop trigger if exists trg_cc_updated_at on public.campaign_contacts;
create trigger trg_cc_updated_at
  before update on public.campaign_contacts
  for each row execute function public.set_updated_at();

alter table public.campaign_contacts enable row level security;

drop policy if exists "cc_select_own" on public.campaign_contacts;
create policy "cc_select_own" on public.campaign_contacts
  for select using (auth.uid() = user_id);

drop policy if exists "cc_insert_own" on public.campaign_contacts;
create policy "cc_insert_own" on public.campaign_contacts
  for insert with check (auth.uid() = user_id);

drop policy if exists "cc_update_own" on public.campaign_contacts;
create policy "cc_update_own" on public.campaign_contacts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "cc_delete_own" on public.campaign_contacts;
create policy "cc_delete_own" on public.campaign_contacts
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0009 lista
-- ════════════════════════════════════════════════════════════════════
