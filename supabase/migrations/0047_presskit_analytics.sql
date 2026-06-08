-- ════════════════════════════════════════════════════════════════════
-- Migration 0047 — RPCs de analytics del press kit (RA-5, Fase 5)
-- ────────────────────────────────────────────────────────────────────
-- listEvents() traía hasta 1000 filas de presskit_events a JS para contar
-- (cap que QA marcó: con un DJ activo en 30/90 días se truncaban los KPIs).
-- Estas RPCs agregan EN SQL, sin tope, y potencian la vista /press-kit/stats:
--   · presskit_event_daily → serie diaria por evento (KPIs + embudo + chart + canal)
--   · presskit_sources     → de dónde llegan (referrer / país / utm_source)
--
-- security definer + scoped a auth.uid() (presskit_events es owner-only); el DJ
-- llama con su sesión. Día bucketeado en hora de Chile (America/Santiago).
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0047_presskit_analytics.sql
-- ════════════════════════════════════════════════════════════════════

create or replace function public.presskit_event_daily(p_days int)
returns table (day date, event text, n bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    (created_at at time zone 'America/Santiago')::date as day,
    event,
    count(*) as n
  from public.presskit_events
  where user_id = auth.uid()
    and created_at >= now() - make_interval(days => greatest(p_days, 1))
  group by 1, 2;
$$;

revoke all on function public.presskit_event_daily(int) from public, anon;
grant execute on function public.presskit_event_daily(int) to authenticated;

comment on function public.presskit_event_daily is
  'RA-5 (0047) — serie diaria de presskit_events del DJ (auth.uid()), agregada en SQL sin el tope de 1000 filas. Día en hora de Chile.';

create or replace function public.presskit_sources(p_days int)
returns table (dimension text, value text, n bigint)
language sql
security definer
set search_path = public, pg_temp
as $$
  with ev as (
    select referrer, country, metadata
    from public.presskit_events
    where user_id = auth.uid()
      and created_at >= now() - make_interval(days => greatest(p_days, 1))
  )
  select 'referrer'::text, nullif(referrer, ''), count(*)
    from ev where nullif(referrer, '') is not null group by 2
  union all
  select 'country'::text, nullif(country, ''), count(*)
    from ev where nullif(country, '') is not null group by 2
  union all
  select 'utm_source'::text, nullif(metadata->>'utm_source', ''), count(*)
    from ev where nullif(metadata->>'utm_source', '') is not null group by 2;
$$;

revoke all on function public.presskit_sources(int) from public, anon;
grant execute on function public.presskit_sources(int) to authenticated;

comment on function public.presskit_sources is
  'RA-5 (0047) — de dónde llegan: agrega referrer/país/utm_source de presskit_events del DJ (auth.uid()), en SQL.';
