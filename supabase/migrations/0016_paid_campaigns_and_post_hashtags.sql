-- 0016 · Sprint 18 — Campañas pagadas + hashtags en posts
--
-- Extiende lo existente sin crear tablas nuevas:
--   1. growth_campaigns: agregar campos de pauta pagada (platform_ads, budget, link
--      al Ads Manager externo, notas de resultado, flag is_paid).
--   2. content_posts: agregar hashtags + extender status check para incluir
--      'idea' y 'borrador' (Trello board).
--   3. baseline_followers + snapshot final ya existen en growth_campaigns —
--      reutilizamos para calcular ROI sin agregar columnas nuevas.

------------------------------------------------------------
-- 1. growth_campaigns: campos de pauta pagada
------------------------------------------------------------

alter table public.growth_campaigns
  add column if not exists is_paid boolean not null default false;

-- Plataformas donde se pautó (separado de `platforms` que es el target genérico).
-- Valores válidos: 'meta_ads' | 'google_ads' | 'tiktok_ads' | 'spotify_ads' | 'youtube_ads'
alter table public.growth_campaigns
  add column if not exists platform_ads text[] not null default array[]::text[];

-- Presupuesto total en CLP (sin decimales — usamos integer por simplicidad).
-- numeric da flexibilidad si en el futuro queremos USD u otra moneda.
alter table public.growth_campaigns
  add column if not exists budget_clp numeric(12, 0) default null;

-- Link al Ads Manager externo (Meta, Google, TikTok). Opcional.
alter table public.growth_campaigns
  add column if not exists external_url text default null;

-- Notas finales del resultado. Se llena al cerrar la campaña.
alter table public.growth_campaigns
  add column if not exists result_notes text not null default '';

-- Comentario explicativo
comment on column public.growth_campaigns.is_paid is
  'true = campaña con pauta pagada (Meta/Google/TikTok Ads). false = orgánica.';
comment on column public.growth_campaigns.platform_ads is
  'Plataformas de pauta usadas. Valores: meta_ads, google_ads, tiktok_ads, spotify_ads, youtube_ads.';
comment on column public.growth_campaigns.budget_clp is
  'Presupuesto total declarado en CLP. NULL para orgánicas.';
comment on column public.growth_campaigns.external_url is
  'Link al Ads Manager externo (Meta/Google/TikTok). Opcional.';
comment on column public.growth_campaigns.result_notes is
  'Notas finales del DJ sobre cómo fue la campaña. Se llena al cerrar.';

------------------------------------------------------------
-- 2. content_posts: hashtags + expand status
------------------------------------------------------------

-- Hashtags asociados al post. Sugeridos por Ollama o escritos a mano.
alter table public.content_posts
  add column if not exists hashtags text[] not null default array[]::text[];

comment on column public.content_posts.hashtags is
  'Hashtags asociados (sin #). Sugeridos por Ollama o escritos manualmente.';

-- Extender el check de status para soportar el Trello board:
-- 'idea' (recién creado, sin fecha) → 'borrador' (con contenido, sin fecha)
-- → 'planeado' (con fecha) [legacy: equivale a programado]
-- → 'publicado' → 'cancelado'.
-- Mantenemos 'planeado' como sinónimo de programado para retro-compat con datos
-- existentes; añadimos 'idea' y 'borrador'.
alter table public.content_posts
  drop constraint if exists content_posts_status_check;

alter table public.content_posts
  add constraint content_posts_status_check
  check (status in ('idea', 'borrador', 'planeado', 'publicado', 'cancelado'));

------------------------------------------------------------
-- 3. Índice para Trello board (consulta por status y user)
------------------------------------------------------------

create index if not exists idx_content_posts_user_status
  on public.content_posts (user_id, status, planned_at desc nulls last);

------------------------------------------------------------
-- 4. Índice para listar campañas pagadas
------------------------------------------------------------

create index if not exists idx_growth_campaigns_user_is_paid
  on public.growth_campaigns (user_id, is_paid, started_at desc);
