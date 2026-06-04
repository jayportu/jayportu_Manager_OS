-- ════════════════════════════════════════════════════════════════════
-- Migration 0037 — adjuntos de correos entrantes (inbox /admin/correo)
-- ────────────────────────────────────────────────────────────────────
-- Guarda la metadata de adjuntos que vienen en el webhook email.received
-- (id, filename, content_type). El archivo NO se guarda acá: al descargar
-- se pide una URL firmada fresca a Resend (GET /emails/receiving/{id}/
-- attachments/{att_id}) vía /api/correo/attachment. Evita egress de Storage.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.inbound_emails
  add column if not exists attachments jsonb not null default '[]'::jsonb;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0037 lista
-- ════════════════════════════════════════════════════════════════════
