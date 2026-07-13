-- 0079_booker_self_verification.sql
--
-- F2b · Verificación self-service del booker. El booker pide verificación
-- (deja evidencia); cae en la cola "Pendientes" de /admin/bookers; el admin
-- aprueba (setea verified_at con service_role). Estas dos columnas NO están
-- protegidas por el trigger protect_booker_verification (que solo congela
-- verified_*/is_founding/account_status), así el dueño puede setearlas vía su
-- RLS update_own — pero NO puede auto-verificarse (verified_at sigue blindado).

alter table public.booker_accounts
  add column if not exists verification_requested_at timestamptz,
  add column if not exists verification_evidence text;
