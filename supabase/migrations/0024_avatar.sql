-- ════════════════════════════════════════════════════════════════════
-- Migration 0024 — foto de perfil (avatar)
-- ────────────────────────────────────────────────────────────────────
-- 1) Agrega columna `avatar_url` a dj_profile (foto de perfil del DJ).
-- 2) Crea el bucket Storage 'avatars': público de lectura (la foto se ve
--    en el press kit /p/[slug] y en el directorio), pero solo el dueño
--    puede subir/reemplazar/borrar en su subdirectorio /{user_id}/...
--
-- Límite: 5 MB por archivo, solo imágenes (jpeg/png/webp).
-- Mismo patrón que la migración 0015b (bucket press-kits).
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists avatar_url text not null default '';

-- ─── Bucket Storage 'avatars' ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ─── Policies sobre storage.objects ───────────────────────────────────
-- SELECT: público (cualquier visitante del press kit puede ver la foto)
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- INSERT: solo si el path empieza con el user_id del que sube
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: solo si el path empieza con el user_id (para reemplazar foto)
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: solo si el path empieza con el user_id
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0024 lista
-- ════════════════════════════════════════════════════════════════════
