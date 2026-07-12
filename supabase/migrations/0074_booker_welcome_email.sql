-- ════════════════════════════════════════════════════════════════════
-- Migration 0074 — Welcome email one-shot para bookers (F1 · activación)
-- ────────────────────────────────────────────────────────────────────
-- Bandera para enviar el correo de bienvenida una sola vez (patrón idéntico a
-- dj_profile.welcome_email_sent_at). El código (booker-activation-emails.ts) la
-- setea SOLO si el envío por Resend fue ok, así un fallo transitorio reintenta.
--
-- No la protege ningún trigger (no es privilegiada); el user actualiza su
-- propia fila. Spoofearla solo se autoperjudica (no recibir el correo).
--
-- Idempotente. Aditiva. Ejecutar en: Supabase Dashboard → SQL Editor.
-- Aplicar ANTES de mergear el código de F1 (el layout lee/escribe la columna).
-- ════════════════════════════════════════════════════════════════════

alter table public.booker_accounts
  add column if not exists welcome_email_sent_at timestamptz;

comment on column public.booker_accounts.welcome_email_sent_at is
  'F1 — instante en que se envió el welcome email al booker (one-shot). NULL = aún no enviado.';

-- ─── Verificación ────────────────────────────────────────────────────────────
-- select column_name from information_schema.columns
--  where table_schema='public' and table_name='booker_accounts'
--    and column_name='welcome_email_sent_at';

-- ─── Reversión ───────────────────────────────────────────────────────────────
-- alter table public.booker_accounts drop column if exists welcome_email_sent_at;

-- ✓ Migration 0074 lista
