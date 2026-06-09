-- ════════════════════════════════════════════════════════════════════
-- Migration 0049 — Eventos públicos + RSVP de fans (RA-7, Fase 5)
-- ────────────────────────────────────────────────────────────────────
-- El DJ puede publicar un show de su calendario como página de evento
-- pública (/e/[token]); fans (sin cuenta) hacen RSVP por email. El loop
-- fan→lead→re-engagement.
--   · calendar_events gana flags de publicación (el evento ES el show).
--   · event_rsvps: una fila por (evento, email), upsert.
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0049_public_events_rsvp.sql
-- ════════════════════════════════════════════════════════════════════

alter table public.calendar_events
  add column if not exists is_public    boolean not null default false,
  add column if not exists public_token text,
  add column if not exists ticket_url   text;

-- token único para la URL pública /e/[token]
create unique index if not exists idx_calendar_events_public_token
  on public.calendar_events(public_token)
  where public_token is not null;

create table if not exists public.event_rsvps (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.calendar_events(id) on delete cascade,
  name          text not null default '',
  email         text not null,
  status        text not null default 'going' check (status in ('going', 'maybe')),
  notify_future boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Dedupe / upsert por (evento, email case-insensitive)
create unique index if not exists idx_event_rsvps_event_email
  on public.event_rsvps(event_id, lower(email));
create index if not exists idx_event_rsvps_event
  on public.event_rsvps(event_id);

alter table public.event_rsvps enable row level security;

-- El DJ lee los RSVPs de SUS eventos (vía ownership del calendar_event).
drop policy if exists "event_rsvps_select_own_events" on public.event_rsvps;
create policy "event_rsvps_select_own_events" on public.event_rsvps
  for select using (
    exists (
      select 1 from public.calendar_events ce
      where ce.id = event_rsvps.event_id and ce.user_id = auth.uid()
    )
  );

-- INSERT/upsert lo hace el endpoint público con service_role (saltea RLS).
-- No hay policy de insert/update/delete para anon/authenticated (no la usan).

comment on table public.event_rsvps is
  'RA-7 (0049) — RSVPs de fans (sin cuenta) a eventos públicos. Insert vía service_role en /api/event-rsvp; select al dueño del evento.';
