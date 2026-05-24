-- ════════════════════════════════════════════════════════════════════
-- Migration 0015 — press kit dual (generated vs uploaded PDF)
-- ────────────────────────────────────────────────────────────────────
-- Hasta ahora la página pública /p/[slug] se construía siempre con
-- los campos del dj_profile (bio, géneros, links, etc.). Esta migración
-- agrega la opción de subir un PDF propio que se muestra tal cual el DJ
-- lo diseñó.
--
-- - press_kit_mode = 'generated' (default) → comportamiento actual,
--   página HTML con bloques desde los campos del perfil
-- - press_kit_mode = 'pdf' → muestra el PDF embed full-screen
--
-- press_kit_pdf_url guarda la URL pública del PDF subido a Supabase
-- Storage (bucket 'press-kits').
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists press_kit_mode text not null default 'generated'
    check (press_kit_mode in ('generated', 'pdf'));

alter table public.dj_profile
  add column if not exists press_kit_pdf_url text not null default '';

alter table public.dj_profile
  add column if not exists press_kit_pdf_filename text not null default '';

alter table public.dj_profile
  add column if not exists press_kit_pdf_size_bytes integer not null default 0;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0015 lista
-- ════════════════════════════════════════════════════════════════════
