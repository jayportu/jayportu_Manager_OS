-- ════════════════════════════════════════════════════════════════════
-- Migration 0046 — RPC de conteos por usuario para el admin (QA · m9)
-- ────────────────────────────────────────────────────────────────────
-- getCountsByUser hacía select('user_id').in(...) sobre contacts /
-- content_posts / platform_snapshots / growth_campaigns y contaba en JS →
-- PostgREST topa en 1000 filas, así que con suficientes filas los conteos
-- por usuario quedaban truncados (subreportados) en la tabla del admin.
-- Este RPC cuenta en SQL (sin tope) y devuelve una fila por user_id pedido.
--
-- security definer + execute solo service_role (admin llama con createAdminClient).
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0046_admin_counts_by_user.sql
-- ════════════════════════════════════════════════════════════════════

create or replace function public.admin_counts_by_user(ids uuid[])
returns table (
  user_id uuid,
  contacts bigint,
  posts bigint,
  snapshots bigint,
  campaigns bigint
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    u as user_id,
    (select count(*) from public.contacts c where c.user_id = u),
    (select count(*) from public.content_posts cp where cp.user_id = u),
    (select count(*) from public.platform_snapshots ps where ps.user_id = u),
    (select count(*) from public.growth_campaigns gc where gc.user_id = u)
  from unnest(ids) as u;
$$;

revoke all on function public.admin_counts_by_user(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_counts_by_user(uuid[]) to service_role;

comment on function public.admin_counts_by_user is
  'Migration 0046 — conteos por usuario (contacts/posts/snapshots/campaigns) en SQL para el admin, sin el tope de 1000 filas de PostgREST.';
