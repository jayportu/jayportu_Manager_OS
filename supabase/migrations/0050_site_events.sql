-- ════════════════════════════════════════════════════════════════════
-- Migration 0050 — site_events: tráfico del sitio (panel /admin/trafico)
-- ────────────────────────────────────────────────────────────────────
-- Pageviews del sitio, anónimos Y registrados (a diferencia de usage_events
-- que exige user_id, y de presskit_events que es por DJ). Alimenta el panel
-- "Tráfico DROP" del admin: visitas, registrados vs anónimos, páginas top,
-- de dónde llegan, conversión y estadía aproximada.
--
-- Insert vía service_role en /api/site-track (el visitante es anónimo).
-- Sin policies públicas → solo service_role lee/escribe (RLS bloquea al resto).
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0050_site_events.sql
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.site_events (
  id            uuid primary key default gen_random_uuid(),
  session_id    text not null,
  path          text not null,
  is_registered boolean not null default false,
  referrer      text,
  utm_source    text,
  country       text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_site_events_created on public.site_events (created_at desc);
create index if not exists idx_site_events_session on public.site_events (session_id);

alter table public.site_events enable row level security;
-- Sin policies a propósito: insert/select solo vía service_role.

comment on table public.site_events is
  'Tráfico del sitio (pageviews anónimos + registrados) para /admin/trafico. Insert vía service_role en /api/site-track.';
