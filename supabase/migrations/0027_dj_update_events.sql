-- ════════════════════════════════════════════════════════════════════
-- Migration 0027 — Sprint RA-3 · Tabla de updates de DJs (Fase 2)
-- ────────────────────────────────────────────────────────────────────
-- Captura "qué pasó nuevo" en un DJ para que el cron de RA-3 mande
-- emails a sus followers (notify_email = true).
--
-- Dos types iniciales:
--   - 'show_scheduled': el DJ agendó un show (un booking pasó a
--     `agendado`). Se inserta desde TS en updateBookingSubmissionStatus
--     porque ahí tenemos el contexto (nombre, venue, fecha).
--   - 'availability_updated': el DJ cambió available_from/until/note.
--     Se inserta automáticamente vía trigger en dj_profile (más simple
--     que rastrear el cambio desde cada path de UI).
--
-- El cron (Fase 3) consulta `where notified_at is null`, agrupa por DJ
-- y por día, manda email y marca notified_at.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.dj_update_events (
  id                 uuid primary key default gen_random_uuid(),
  dj_user_id         uuid not null references auth.users(id) on delete cascade,
  type               text not null check (type in (
                       'show_scheduled',
                       'availability_updated'
                     )),
  payload            jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  notified_at        timestamptz default null
);

-- Index principal: el cron busca lo no notificado por DJ.
create index if not exists idx_dj_update_events_dj_unnotified
  on public.dj_update_events(dj_user_id, created_at desc)
  where notified_at is null;

-- Index secundario: feed del booker (todos los DJs que sigue, recientes).
create index if not exists idx_dj_update_events_recent
  on public.dj_update_events(created_at desc);

-- RLS: el DJ ve sus propios events (debugging / feed propio futuro).
-- Inserts solo via service_role (cron + server actions).
alter table public.dj_update_events enable row level security;

drop policy if exists "dj_update_events_select_own" on public.dj_update_events;
create policy "dj_update_events_select_own" on public.dj_update_events
  for select using (auth.uid() = dj_user_id);

-- INSERT: el DJ puede insertar sus propios events (desde server actions
-- que usen el client del user, ej. presskit.ts cuando un booking pasa a
-- 'agendado'). El cron usa service_role y bypassea RLS.
drop policy if exists "dj_update_events_insert_own" on public.dj_update_events;
create policy "dj_update_events_insert_own" on public.dj_update_events
  for insert with check (auth.uid() = dj_user_id);

-- ─── Trigger automático para 'availability_updated' ────────────────
-- Se dispara cuando cambia available_from/until/note en dj_profile,
-- desde CUALQUIER path. Usa IS DISTINCT FROM para manejar NULLs.

create or replace function public.emit_availability_update_event()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.available_from is distinct from old.available_from
     or new.available_until is distinct from old.available_until
     or new.available_note is distinct from old.available_note then
    insert into public.dj_update_events (dj_user_id, type, payload)
    values (
      new.user_id,
      'availability_updated',
      jsonb_build_object(
        'available_from', new.available_from,
        'available_until', new.available_until,
        'available_note', new.available_note
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dj_availability_update on public.dj_profile;
create trigger trg_dj_availability_update
  after update on public.dj_profile
  for each row execute function public.emit_availability_update_event();

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0027 lista
-- ════════════════════════════════════════════════════════════════════
