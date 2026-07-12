-- 0076_booker_lifecycle_email_columns.sql
--
-- F4 · Crons de lifecycle del booker. Columnas one-shot (patrón
-- onboarding_nudge_sent_at / welcome_email_sent_at): cada cron marca su columna
-- SOLO tras un envío ok, para nunca reenviar el mismo aviso. Todas nullable, sin
-- backfill. Se escriben únicamente con service_role (admin client) desde el cron;
-- no requieren cambios de RLS ni tocan los triggers protect_* de booker_accounts
-- (esos solo congelan verified_*/is_founding/account_status para no-service_role).

-- noResponde: cotización enviada por el DJ que el booker no respondió en 3 días.
alter table public.booking_form_submissions
  add column if not exists no_response_email_sent_at timestamptz;

-- favorito: alguien guardó el perfil del DJ (aviso al DJ). One-shot por fila de
-- favorito; el cron agrupa por DJ para no mandar más de un correo por corrida.
alter table public.booker_favorites
  add column if not exists favorito_email_sent_at timestamptz;

-- sinBooking (7d) e inactivo30d (30d): retención/win-back al booker.
alter table public.booker_accounts
  add column if not exists sin_booking_email_sent_at timestamptz,
  add column if not exists inactivo30d_email_sent_at timestamptz;
