-- 0021 · Bloque B — Cuentas de Booker
--
-- Introduce el lado consumidor del producto: bookers (productores, venues,
-- promotores, novios buscando DJ para casamiento, agencias). Diferente al
-- DJ (creator), el Booker sólo consume press kits y contacta DJs.
--
-- Diseño:
--  - DJs siguen siendo beta cerrada (invite vía /beta).
--  - Bookers son signup ABIERTO (mail + password), no requieren invite.
--    Razón: necesitamos volumen de bookers reales para que los flows de
--    booking tengan sentido para los DJs en beta.
--  - Auth: ambos viven en auth.users de Supabase. Para diferenciarlos
--    usamos la existencia de dj_profile vs booker_accounts. Si un user
--    tiene dj_profile → DJ. Si tiene booker_accounts y NO dj_profile →
--    Booker. Layout y rutas separadas (/dashboard vs /booker).
--
-- Tres bloques:
--   B1 · booker_accounts (perfil del booker, 1:1 con auth.users)
--   B2 · booker_favorites (DJs guardados por el booker, N:N)
--   B3 · booking_form_submissions.booker_user_id + view_token
--        Link bookings con bookers logueados + token para vista pública /b/[token]

------------------------------------------------------------
-- B1 · booker_accounts
------------------------------------------------------------

create table if not exists public.booker_accounts (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null default '',
  email            text not null default '',
  -- Tipo de booker para segmentación futura (opcional, freeform OK)
  booker_type      text not null default 'otro'
    check (booker_type in (
      'venue', 'productora', 'agencia', 'evento_privado',
      'casamiento', 'corporativo', 'festival', 'otro'
    )),
  city             text not null default '',
  country          text not null default '',
  whatsapp         text not null default '',
  -- Marketing soft prefs (opt-in/out futuro)
  newsletter_optin boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_booker_accounts_email
  on public.booker_accounts (email);

drop trigger if exists trg_booker_accounts_updated_at on public.booker_accounts;
create trigger trg_booker_accounts_updated_at
  before update on public.booker_accounts
  for each row execute function public.set_updated_at();

alter table public.booker_accounts enable row level security;

-- Owner reads/writes only su propia cuenta.
drop policy if exists "booker_accounts_select_own" on public.booker_accounts;
create policy "booker_accounts_select_own" on public.booker_accounts
  for select using (auth.uid() = user_id);

drop policy if exists "booker_accounts_insert_own" on public.booker_accounts;
create policy "booker_accounts_insert_own" on public.booker_accounts
  for insert with check (auth.uid() = user_id);

drop policy if exists "booker_accounts_update_own" on public.booker_accounts;
create policy "booker_accounts_update_own" on public.booker_accounts
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "booker_accounts_delete_own" on public.booker_accounts;
create policy "booker_accounts_delete_own" on public.booker_accounts
  for delete using (auth.uid() = user_id);

comment on table public.booker_accounts is
  'Bloque B — Perfil del Booker (consumidor del producto). Signup abierto, NO requiere invite (vs DJs que son beta cerrada).';

------------------------------------------------------------
-- B2 · booker_favorites (DJs guardados)
------------------------------------------------------------

create table if not exists public.booker_favorites (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- FK al user_id del DJ (no a dj_profile.user_id que es el mismo)
  dj_user_id    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),

  -- Un booker no puede tener al mismo DJ favoriteado 2 veces
  constraint booker_favorites_unique unique (user_id, dj_user_id)
);

create index if not exists idx_booker_favorites_user
  on public.booker_favorites (user_id, created_at desc);

-- Index inverso para que el DJ pueda saber cuántos lo tienen favoriteado
-- (futuro: KPI en /press-kit).
create index if not exists idx_booker_favorites_dj
  on public.booker_favorites (dj_user_id);

alter table public.booker_favorites enable row level security;

-- El booker ve y maneja sus favoritos.
drop policy if exists "booker_favorites_select_own" on public.booker_favorites;
create policy "booker_favorites_select_own" on public.booker_favorites
  for select using (auth.uid() = user_id);

drop policy if exists "booker_favorites_insert_own" on public.booker_favorites;
create policy "booker_favorites_insert_own" on public.booker_favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "booker_favorites_delete_own" on public.booker_favorites;
create policy "booker_favorites_delete_own" on public.booker_favorites
  for delete using (auth.uid() = user_id);

comment on table public.booker_favorites is
  'Bloque B — N:N entre booker (user_id) y DJ (dj_user_id). Hearted en press kit y /dj.';

------------------------------------------------------------
-- B3 · booking_form_submissions: booker_user_id + view_token
------------------------------------------------------------

-- Link opcional al booker logueado que mandó el form. NULL si fue anónimo.
alter table public.booking_form_submissions
  add column if not exists booker_user_id uuid
    references auth.users(id) on delete set null;

create index if not exists idx_bookings_booker_user
  on public.booking_form_submissions (booker_user_id, created_at desc)
  where booker_user_id is not null;

-- Token público para que el booker pueda ver el estado de SU request
-- sin necesidad de login (vía /b/[token]). Se genera siempre al crear.
alter table public.booking_form_submissions
  add column if not exists view_token uuid
    default gen_random_uuid();

-- Backfill: bookings antiguos (pre-Bloque B) que no tienen view_token.
-- Nota: ADD COLUMN ... DEFAULT gen_random_uuid() ya genera UUIDs por fila
-- (es función volatile), pero dejamos el UPDATE como safety net si por
-- algún motivo quedó algún NULL.
update public.booking_form_submissions
set view_token = gen_random_uuid()
where view_token is null;

-- Garantizamos que no queden NULLs antes de la UNIQUE constraint.
alter table public.booking_form_submissions
  alter column view_token set not null;

-- Unique para evitar colisiones (gen_random_uuid garantiza pero defendemos).
alter table public.booking_form_submissions
  drop constraint if exists booking_form_submissions_view_token_unique;
alter table public.booking_form_submissions
  add constraint booking_form_submissions_view_token_unique
  unique (view_token);

-- Index para lookup por token.
create index if not exists idx_bookings_view_token
  on public.booking_form_submissions (view_token);

-- Booker logueado puede SELECT sus propios bookings (los que tienen su
-- booker_user_id). No puede UPDATE — solo el DJ controla el estado.
drop policy if exists "bookings_select_booker_own" on public.booking_form_submissions;
create policy "bookings_select_booker_own" on public.booking_form_submissions
  for select using (auth.uid() = booker_user_id);

comment on column public.booking_form_submissions.booker_user_id is
  'Bloque B — Si el form se mandó con booker logueado, este es su user_id.';
comment on column public.booking_form_submissions.view_token is
  'Bloque B — Token público para vista /b/[token] sin login.';
