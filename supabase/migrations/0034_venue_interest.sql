-- ════════════════════════════════════════════════════════════════════
-- Migration 0034 — venue_interest (Fase 3 booker · "me gustaría tocar")
-- ────────────────────────────────────────────────────────────────────
-- El reverso de booker_favorites. Un DJ marca "⭐ me gustaría tocar acá"
-- sobre un lugar del directorio. Señal gratis e ilimitada (anti-spam: es
-- un tap, no un mensaje). El lugar ve la lista de DJs interesados y los
-- contacta él, si quiere.
--
-- El pitch completo (con tokens) es Fase 4 — acá solo la señal de interés.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.venue_interest (
  id             uuid primary key default gen_random_uuid(),
  dj_user_id     uuid not null references auth.users(id) on delete cascade,
  booker_user_id uuid not null references auth.users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (dj_user_id, booker_user_id)
);

-- El lugar lista a sus interesados
create index if not exists idx_venue_interest_booker
  on public.venue_interest(booker_user_id, created_at desc);
-- El DJ lista los lugares que marcó
create index if not exists idx_venue_interest_dj
  on public.venue_interest(dj_user_id);

alter table public.venue_interest enable row level security;

-- SELECT: lo ven ambas partes (el DJ que marcó y el lugar marcado)
drop policy if exists venue_interest_select on public.venue_interest;
create policy venue_interest_select on public.venue_interest
  for select using (
    auth.uid() = dj_user_id or auth.uid() = booker_user_id
  );

-- INSERT: solo el DJ marca su propio interés
drop policy if exists venue_interest_insert on public.venue_interest;
create policy venue_interest_insert on public.venue_interest
  for insert with check (auth.uid() = dj_user_id);

-- DELETE: solo el DJ quita su propio interés
drop policy if exists venue_interest_delete on public.venue_interest;
create policy venue_interest_delete on public.venue_interest
  for delete using (auth.uid() = dj_user_id);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0034 lista
-- ════════════════════════════════════════════════════════════════════
