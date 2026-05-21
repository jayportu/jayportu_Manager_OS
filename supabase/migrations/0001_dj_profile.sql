-- ════════════════════════════════════════════════════════════════════
-- Migration 0001 — dj_profile
-- ────────────────────────────────────────────────────────────────────
-- Tabla 1:1 con auth.users que guarda la identidad pública del DJ.
-- Solo Jaime (single-user) pero diseñada por user_id por si escala.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar y Run
-- ════════════════════════════════════════════════════════════════════

-- ─── Helper: trigger para auto-actualizar updated_at ──────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Tabla: dj_profile ────────────────────────────────────────────────
create table if not exists public.dj_profile (
  -- Identidad
  user_id        uuid primary key references auth.users(id) on delete cascade,
  artist_name    text not null default '',
  tagline        text default '',

  -- Bio
  bio_short      text default '',
  bio_long       text default '',

  -- Estilos musicales (array)
  genres         text[] default array[]::text[],

  -- Ubicación
  city           text default 'Santiago',
  country        text default 'Chile',

  -- Canales públicos
  instagram_url  text default '',
  soundcloud_url text default '',
  youtube_url    text default '',
  spotify_url    text default '',
  website        text default '',

  -- Contacto público (separado de auth.email)
  public_email   text default '',
  whatsapp       text default '',

  -- Branding
  logo_url       text default '',
  hero_image_url text default '',

  -- Tech rider (texto libre, lo estructuramos en sprint futuro si hace falta)
  tech_rider_ideal text default '',
  tech_rider_alt   text default '',
  hospitality      text default '',

  -- Timestamps
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger updated_at
drop trigger if exists trg_dj_profile_updated_at on public.dj_profile;
create trigger trg_dj_profile_updated_at
  before update on public.dj_profile
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────
alter table public.dj_profile enable row level security;

-- Policy: solo lectura del propio perfil (auth.uid() = user_id)
drop policy if exists "dj_profile_select_own" on public.dj_profile;
create policy "dj_profile_select_own"
  on public.dj_profile for select
  using (auth.uid() = user_id);

-- Policy: solo insertar el propio perfil
drop policy if exists "dj_profile_insert_own" on public.dj_profile;
create policy "dj_profile_insert_own"
  on public.dj_profile for insert
  with check (auth.uid() = user_id);

-- Policy: solo update del propio perfil
drop policy if exists "dj_profile_update_own" on public.dj_profile;
create policy "dj_profile_update_own"
  on public.dj_profile for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: solo borrar el propio perfil
drop policy if exists "dj_profile_delete_own" on public.dj_profile;
create policy "dj_profile_delete_own"
  on public.dj_profile for delete
  using (auth.uid() = user_id);

-- ─── Auto-crear dj_profile cuando un usuario se registra ─────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.dj_profile (user_id, artist_name)
  values (new.id, '')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Backfill: crear profile para usuarios YA registrados ────────────
insert into public.dj_profile (user_id, artist_name)
select id, ''
from auth.users
on conflict (user_id) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0001 lista
-- ════════════════════════════════════════════════════════════════════
