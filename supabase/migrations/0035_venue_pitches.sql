-- ════════════════════════════════════════════════════════════════════
-- Migration 0035 — venue_pitches (Fase 4a booker · pitches DJ→Lugar)
-- ────────────────────────────────────────────────────────────────────
-- Un DJ manda un "pitch" a un lugar que acepta pitches (accepts_pitches).
-- Cuesta 🪙1 token (ver getPitchTokenBalance: 10/mes computado, no se
-- acumulan). El lugar lo recibe y al verlo se marca viewed_at → el DJ ve
-- "visto" y ahí se consume el token de verdad.
--
-- DEVOLUCIÓN: el balance de tokens es COMPUTADO, no un contador. Un pitch
-- cuenta contra el cupo solo si está visto O si sigue pendiente dentro de
-- los 14 días. Si pasan 14 días sin verse, deja de contar → token
-- "devuelto" automáticamente sin cron. (Lógica en queries/booker.ts.)
--
-- La compra de packs de tokens vía MercadoPago (Fase 4b) queda DIFERIDA a
-- lanzamiento — en beta todos tienen 10/mes gratis.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.venue_pitches (
  id             uuid primary key default gen_random_uuid(),
  dj_user_id     uuid not null references auth.users(id) on delete cascade,
  booker_user_id uuid not null references auth.users(id) on delete cascade,
  message        text not null default '',
  availability   text not null default '',
  created_at     timestamptz not null default now(),
  viewed_at      timestamptz,
  unique (dj_user_id, booker_user_id)
);

-- El lugar lista los pitches recibidos
create index if not exists idx_venue_pitches_booker
  on public.venue_pitches(booker_user_id, created_at desc);
-- El DJ cuenta sus pitches del mes (balance de tokens)
create index if not exists idx_venue_pitches_dj
  on public.venue_pitches(dj_user_id, created_at desc);

alter table public.venue_pitches enable row level security;

-- SELECT: ambas partes (DJ que mandó y lugar que recibió)
drop policy if exists venue_pitches_select on public.venue_pitches;
create policy venue_pitches_select on public.venue_pitches
  for select using (
    auth.uid() = dj_user_id or auth.uid() = booker_user_id
  );

-- INSERT: solo el DJ manda su propio pitch
drop policy if exists venue_pitches_insert on public.venue_pitches;
create policy venue_pitches_insert on public.venue_pitches
  for insert with check (auth.uid() = dj_user_id);

-- UPDATE: el lugar marca viewed_at (recibió/abrió el pitch)
drop policy if exists venue_pitches_update_booker on public.venue_pitches;
create policy venue_pitches_update_booker on public.venue_pitches
  for update using (auth.uid() = booker_user_id);

-- DELETE: el DJ puede retractar su pitch
drop policy if exists venue_pitches_delete on public.venue_pitches;
create policy venue_pitches_delete on public.venue_pitches
  for delete using (auth.uid() = dj_user_id);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0035 lista
-- ════════════════════════════════════════════════════════════════════
