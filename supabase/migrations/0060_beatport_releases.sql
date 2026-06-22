-- 0060 · Discografía — releases de Beatport (embed oficial)
--
-- URLs de tracks/releases de Beatport que el DJ destaca. Se embeben con el
-- player oficial (embed.beatport.com) → carga client-side, sin el bloqueo de
-- Cloudflare que impide scrapear server-side. text[] como featured_sets.

alter table public.dj_profile
  add column if not exists beatport_releases text[] not null default '{}'::text[];

comment on column public.dj_profile.beatport_releases is
  'Discografía · URLs de releases/tracks de Beatport (se embeben con el player oficial). Público.';
