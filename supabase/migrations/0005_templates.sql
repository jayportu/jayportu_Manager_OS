-- ════════════════════════════════════════════════════════════════════
-- Migration 0005 — Templates (mensajes reutilizables con variables)
-- ════════════════════════════════════════════════════════════════════
-- Plantillas multi-canal con placeholders tipo {contact_name}, {my_name},
-- {presskit_url} que se resuelven en runtime al usar.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.templates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- Identidad
  name              text not null,
  category          text not null default 'otro'
                    check (category in (
                      'primer_contacto',
                      'follow_up',
                      'envio_press_kit',
                      'propuesta',
                      'agradecimiento',
                      'confirmacion',
                      'rider',
                      'otro'
                    )),
  channel_suggested text not null default 'whatsapp'
                    check (channel_suggested in (
                      'whatsapp', 'email', 'instagram', 'otro'
                    )),

  -- Contenido
  subject           text default '',          -- solo para email
  body              text not null default '',

  -- Stats
  times_used        int not null default 0,
  last_used_at      timestamptz,

  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_templates_user
  on public.templates(user_id, category);

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- RLS
alter table public.templates enable row level security;

drop policy if exists "templates_select_own" on public.templates;
create policy "templates_select_own" on public.templates
  for select using (auth.uid() = user_id);

drop policy if exists "templates_insert_own" on public.templates;
create policy "templates_insert_own" on public.templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "templates_update_own" on public.templates;
create policy "templates_update_own" on public.templates
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "templates_delete_own" on public.templates;
create policy "templates_delete_own" on public.templates
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0005 lista
-- ════════════════════════════════════════════════════════════════════
