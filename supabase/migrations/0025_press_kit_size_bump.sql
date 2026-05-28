-- ════════════════════════════════════════════════════════════════════
-- Migration 0025 — bump del límite de tamaño del bucket press-kits
-- ────────────────────────────────────────────────────────────────────
-- 10 MB era estrecho para press kits con imágenes embebidas o varias
-- páginas. Subimos a 25 MB (sigue muy por debajo del límite por request
-- de Supabase Storage).
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

update storage.buckets
  set file_size_limit = 26214400  -- 25 MB
  where id = 'press-kits';

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0025 lista
-- ════════════════════════════════════════════════════════════════════
