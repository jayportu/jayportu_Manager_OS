-- ════════════════════════════════════════════════════════════════════
-- Migration 0067 — link_in_bio_links (Fase 4 · Link-in-bio editable)
-- ────────────────────────────────────────────────────────────────────
-- Links de la página pública tipo Linktree del DJ (/l/{slug}).
-- Se auto-seedean desde las redes del perfil la 1ª vez; el DJ los edita
-- (orden, activo/oculto, agregar propios) desde /link-in-bio.
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → pegar y Run.
-- Aditiva: crea una tabla nueva, no toca datos existentes.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.link_in_bio_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  url        text not null,
  position   int  not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_lib_links_user
  on public.link_in_bio_links(user_id, position);

alter table public.link_in_bio_links enable row level security;

-- El dueño ve/edita TODOS sus links (activos e inactivos, para el editor).
drop policy if exists lib_links_owner_all on public.link_in_bio_links;
create policy lib_links_owner_all on public.link_in_bio_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cualquiera puede LEER los links activos (página pública /l/{slug}).
drop policy if exists lib_links_public_read on public.link_in_bio_links;
create policy lib_links_public_read on public.link_in_bio_links
  for select using (active = true);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0067 lista
-- ════════════════════════════════════════════════════════════════════
