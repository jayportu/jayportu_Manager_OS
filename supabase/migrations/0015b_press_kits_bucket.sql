-- ════════════════════════════════════════════════════════════════════
-- Migration 0015b — bucket Storage para PDFs de press kit
-- ────────────────────────────────────────────────────────────────────
-- Bucket 'press-kits' público de lectura (cualquiera puede ver los
-- PDFs subidos), pero solo el dueño puede insertar/actualizar/borrar
-- en su propio subdirectorio /{user_id}/...
--
-- Límite: 10 MB por archivo, solo PDFs.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'press-kits',
  'press-kits',
  true,
  10485760, -- 10 MB
  array['application/pdf']
)
on conflict (id) do nothing;

-- ─── Policies sobre storage.objects ───────────────────────────────────
-- SELECT: público (cualquier visitante del press kit puede ver el PDF)
drop policy if exists "press_kits_public_read" on storage.objects;
create policy "press_kits_public_read"
  on storage.objects for select
  using (bucket_id = 'press-kits');

-- INSERT: solo si el path empieza con el user_id del que sube
drop policy if exists "press_kits_insert_own" on storage.objects;
create policy "press_kits_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'press-kits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- UPDATE: solo si el path empieza con el user_id (para reemplazar PDF)
drop policy if exists "press_kits_update_own" on storage.objects;
create policy "press_kits_update_own"
  on storage.objects for update
  using (
    bucket_id = 'press-kits'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'press-kits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- DELETE: solo si el path empieza con el user_id
drop policy if exists "press_kits_delete_own" on storage.objects;
create policy "press_kits_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'press-kits'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0015b lista
-- ════════════════════════════════════════════════════════════════════
