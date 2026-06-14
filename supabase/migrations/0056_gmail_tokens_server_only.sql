-- ════════════════════════════════════════════════════════════════════
-- Migration 0054 — Tokens de Gmail: solo accesibles desde el servidor
-- ────────────────────────────────────────────────────────────────────
-- AUDITORÍA 2026-06-13 (riesgo medio-alto):
-- gmail_connections guarda los tokens OAuth de Google (access + refresh) que
-- dan acceso al correo del DJ. Tenía policies RLS "own" (select/insert/update/
-- delete) que permitían que el DUEÑO leyera/escribiera sus tokens DIRECTO desde
-- el navegador con el anon key (`GET /rest/v1/gmail_connections?select=
-- refresh_token`). Un XSS o una extensión maliciosa podía exfiltrar el refresh
-- token → acceso permanente al correo, sobrevive al cambio de contraseña.
--
-- Los tokens nunca se necesitan en el cliente: el servidor los usa con el client
-- service_role. Ya migramos TODOS los accesos de la app (getGmailToken,
-- getMyGmailConnection, deleteGmailConnection, el upsert del callback OAuth, y el
-- update de last_sync_at) a service_role + filtro explícito `.eq("user_id")`.
-- El cron de calendario (sync-job) ya usaba service_role.
--
-- Quitamos las 4 policies → con RLS habilitado y sin policies, los roles anon y
-- authenticated quedan SIN acceso a la tabla; solo service_role (que bypasea
-- RLS) puede tocarla. RLS sigue ENABLED (deny-by-default).
--
-- Idempotente. Ejecutar:
--   node scripts/run_migration.mjs supabase/migrations/0054_gmail_tokens_server_only.sql
-- ════════════════════════════════════════════════════════════════════

-- RLS sigue habilitado (no lo tocamos) — sin policies = deny para anon/authenticated.
alter table public.gmail_connections enable row level security;

drop policy if exists "gmail_select_own" on public.gmail_connections;
drop policy if exists "gmail_insert_own" on public.gmail_connections;
drop policy if exists "gmail_update_own" on public.gmail_connections;
drop policy if exists "gmail_delete_own" on public.gmail_connections;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0054 lista
-- ════════════════════════════════════════════════════════════════════
