-- ════════════════════════════════════════════════════════════════════
-- Migration 0010 — Growth (crecimiento de audiencia/seguidores)
-- ════════════════════════════════════════════════════════════════════
-- Distinto de las /campanas existentes (que son outreach 1-a-1):
--   - growth_campaigns: iniciativas de crecimiento en redes
--   - content_posts: posts publicados/planeados (con o sin campaña)
--   - platform_snapshots: estado de cada plataforma en un momento
-- ════════════════════════════════════════════════════════════════════

-- ─── growth_campaigns ────────────────────────────────────────────────
create table if not exists public.growth_campaigns (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  name            text not null,
  goal            text default '',
  status          text not null default 'active'
                  check (status in (
                    'draft', 'active', 'paused', 'done', 'archived'
                  )),

  -- Plataformas afectadas (1+)
  platforms       text[] not null default array[]::text[],

  -- Objetivos (todos opcionales)
  target_followers       jsonb default '{}'::jsonb,  -- {instagram: 1500, youtube: 200}
  target_engagement_rate numeric,                    -- %, ej 5.0
  target_posts_count     int,                       -- ej 12 posts en el período
  target_reach           int,                       -- alcance objetivo

  -- Baseline al iniciar (snapshot)
  baseline_followers     jsonb default '{}'::jsonb,
  baseline_at            timestamptz,

  -- Tiempos
  started_at      timestamptz default now(),
  end_date        date,
  ended_at        timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_growth_campaigns_user_status
  on public.growth_campaigns(user_id, status, created_at desc);

drop trigger if exists trg_growth_campaigns_updated_at on public.growth_campaigns;
create trigger trg_growth_campaigns_updated_at
  before update on public.growth_campaigns
  for each row execute function public.set_updated_at();

alter table public.growth_campaigns enable row level security;

drop policy if exists "growth_campaigns_select_own" on public.growth_campaigns;
create policy "growth_campaigns_select_own" on public.growth_campaigns
  for select using (auth.uid() = user_id);

drop policy if exists "growth_campaigns_insert_own" on public.growth_campaigns;
create policy "growth_campaigns_insert_own" on public.growth_campaigns
  for insert with check (auth.uid() = user_id);

drop policy if exists "growth_campaigns_update_own" on public.growth_campaigns;
create policy "growth_campaigns_update_own" on public.growth_campaigns
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "growth_campaigns_delete_own" on public.growth_campaigns;
create policy "growth_campaigns_delete_own" on public.growth_campaigns
  for delete using (auth.uid() = user_id);


-- ─── content_posts ───────────────────────────────────────────────────
create table if not exists public.content_posts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  growth_campaign_id  uuid references public.growth_campaigns(id) on delete set null,

  -- Identidad
  platform            text not null
                      check (platform in (
                        'instagram', 'youtube', 'soundcloud',
                        'tiktok', 'twitter', 'facebook', 'otro'
                      )),
  format              text not null default 'post'
                      check (format in (
                        'reel', 'post', 'story', 'carousel',
                        'video', 'short', 'live',
                        'set', 'track', 'mix',
                        'otro'
                      )),
  title               text default '',
  description         text default '',
  url                 text default '',

  -- Estado
  status              text not null default 'planeado'
                      check (status in (
                        'planeado', 'publicado', 'cancelado'
                      )),

  -- Tiempos
  planned_at          timestamptz,
  published_at        timestamptz,

  -- Métricas (snapshot manual)
  views               int,
  likes               int,
  comments            int,
  shares              int,
  saves               int,
  plays               int,
  reach               int,

  -- Análisis
  notes               text default '',
  ai_analysis         text default '',
  performance_score   int,  -- 0-100, calculado o manual

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_content_posts_user_platform
  on public.content_posts(user_id, platform, published_at desc nulls last);
create index if not exists idx_content_posts_campaign
  on public.content_posts(growth_campaign_id, published_at desc nulls last)
  where growth_campaign_id is not null;
create index if not exists idx_content_posts_status
  on public.content_posts(user_id, status, planned_at);

drop trigger if exists trg_content_posts_updated_at on public.content_posts;
create trigger trg_content_posts_updated_at
  before update on public.content_posts
  for each row execute function public.set_updated_at();

alter table public.content_posts enable row level security;

drop policy if exists "content_posts_select_own" on public.content_posts;
create policy "content_posts_select_own" on public.content_posts
  for select using (auth.uid() = user_id);

drop policy if exists "content_posts_insert_own" on public.content_posts;
create policy "content_posts_insert_own" on public.content_posts
  for insert with check (auth.uid() = user_id);

drop policy if exists "content_posts_update_own" on public.content_posts;
create policy "content_posts_update_own" on public.content_posts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "content_posts_delete_own" on public.content_posts;
create policy "content_posts_delete_own" on public.content_posts
  for delete using (auth.uid() = user_id);


-- ─── platform_snapshots ──────────────────────────────────────────────
-- Snapshot del estado de cada plataforma en un momento.
-- Jaime los crea manualmente (a veces) para ver evolución.
create table if not exists public.platform_snapshots (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,

  platform        text not null
                  check (platform in (
                    'instagram', 'youtube', 'soundcloud',
                    'tiktok', 'twitter', 'facebook', 'otro'
                  )),

  -- Stats principales
  followers           int,
  following           int,
  total_posts         int,
  total_views_lifetime bigint,
  total_likes_lifetime bigint,
  engagement_rate     numeric,    -- %, calculado o manual

  notes               text default '',
  snapshot_at         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index if not exists idx_snapshots_user_platform_at
  on public.platform_snapshots(user_id, platform, snapshot_at desc);

alter table public.platform_snapshots enable row level security;

drop policy if exists "platform_snapshots_select_own" on public.platform_snapshots;
create policy "platform_snapshots_select_own" on public.platform_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists "platform_snapshots_insert_own" on public.platform_snapshots;
create policy "platform_snapshots_insert_own" on public.platform_snapshots
  for insert with check (auth.uid() = user_id);

drop policy if exists "platform_snapshots_update_own" on public.platform_snapshots;
create policy "platform_snapshots_update_own" on public.platform_snapshots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "platform_snapshots_delete_own" on public.platform_snapshots;
create policy "platform_snapshots_delete_own" on public.platform_snapshots
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0010 lista
-- ════════════════════════════════════════════════════════════════════
