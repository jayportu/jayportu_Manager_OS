-- ════════════════════════════════════════════════════════════════════
-- Migration 0073 — Consentimiento de bookers (F0 · PR-C)
-- ────────────────────────────────────────────────────────────────────
-- C-04/C-05: el signup de booker no registraba la aceptación de Términos /
-- Privacidad. Se agregan columnas para hacer el consentimiento DEMOSTRABLE
-- (qué versión aceptó y cuándo), mismo patrón que dj_profile (0031).
--
-- Decisión A1: columnas en booker_accounts para F0 (desbloquea la cohorte).
-- Una tabla append-only user_consents(user_id, doc_type, version, accepted_at,
-- ip, user_agent) es más defendible legalmente (BL-08) y queda como P1 del
-- track legal. La implementación técnica NO garantiza por sí sola el
-- cumplimiento de la Ley 21.719 (requiere validación legal externa).
--
-- NO se hace backfill: las cuentas existentes quedan con tos_accepted_at NULL
-- y el portal (booker/layout) les exige aceptar antes de operar (aceptación
-- diferida). Backfillear sería consentimiento no demostrable — justo lo que se
-- evita.
--
-- Idempotente. Aditiva. NO borra datos.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--   (o: node scripts/run_migration.mjs supabase/migrations/0073_booker_consent.sql)
--
-- ORDEN DE DESPLIEGUE: aplicar esta migración ANTES de mergear el código de
-- PR-C (el layout lee tos_accepted_at; si la columna no existe, el valor llega
-- undefined y el gate NO se muestra — fail-open — pero el signup no persistiría
-- el consentimiento hasta tener la columna).
-- ════════════════════════════════════════════════════════════════════

alter table public.booker_accounts
  add column if not exists tos_accepted_at timestamptz,
  add column if not exists tos_version     text;

comment on column public.booker_accounts.tos_accepted_at is
  'F0/C-04 — instante en que el booker aceptó Términos+Privacidad (click-wrap). NULL = pendiente (aceptación diferida en el portal). Sin backfill: consentimiento demostrable.';
comment on column public.booker_accounts.tos_version is
  'F0/C-04 — versión de documentos aceptada (TOS_VERSION, ej. 2026-06-02). Permite pedir re-aceptación si cambian materialmente.';

-- ─── Verificación (correr tras aplicar) ──────────────────────────────────────
-- (a) Columnas presentes:
--     select column_name, data_type from information_schema.columns
--      where table_schema='public' and table_name='booker_accounts'
--        and column_name in ('tos_accepted_at','tos_version');
-- (b) Tras un signup NUEVO de booker: la fila debe traer tos_accepted_at (now)
--     y tos_version='2026-06-02'.
-- (c) Cuentas viejas: ambas NULL → el portal muestra el interstitial de
--     aceptación diferida.

-- ─── Reversión ───────────────────────────────────────────────────────────────
-- alter table public.booker_accounts
--   drop column if exists tos_accepted_at,
--   drop column if exists tos_version;

-- ✓ Migration 0073 lista
