-- ════════════════════════════════════════════════════════════════════
-- Migration 0045 — RPC para el funnel de onboarding (QA · H11)
-- ────────────────────────────────────────────────────────────────────
-- El funnel de /admin/analytics contaba FILAS (count exact head) en contacts/
-- gmail_connections/tracklists, no USUARIOS únicos → un user con 5 contactos
-- contaba 5 y los % podían pasar de 100%. PostgREST no soporta count(distinct),
-- así que exponemos un RPC que devuelve los 3 conteos de usuarios distintos.
--
-- security definer + execute solo para service_role (la analytics se llama con
-- createAdminClient tras assertAdmin). Revocado de anon/authenticated.
--
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0045_onboarding_funnel_distinct.sql
-- ════════════════════════════════════════════════════════════════════

create or replace function public.onboarding_funnel_counts()
returns table (
  contact_creators bigint,
  gmail_connected bigint,
  tracklist_creators bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    (select count(distinct user_id) from public.contacts),
    (select count(distinct user_id) from public.gmail_connections),
    (select count(distinct user_id) from public.tracklists);
$$;

revoke all on function public.onboarding_funnel_counts() from public, anon, authenticated;
grant execute on function public.onboarding_funnel_counts() to service_role;

comment on function public.onboarding_funnel_counts is
  'Migration 0045 — conteos de usuarios DISTINTOS para el funnel de onboarding del admin. Reemplaza count de filas (que inflaba los %). Solo service_role.';
