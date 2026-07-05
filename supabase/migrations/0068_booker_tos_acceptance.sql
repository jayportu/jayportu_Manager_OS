-- 0068_booker_tos_acceptance.sql · BL-08 (evidencia de consentimiento).
--
-- Registra la aceptación de Términos + Política de Privacidad del BOOKER,
-- espejo de dj_profile.tos_accepted_at/tos_version (migración 0031). Hasta
-- ahora el signup de booker no dejaba evidencia de aceptación.
--
-- Idempotente y NO destructiva. No aplicar en producción sin autorización
-- (el .env.local del repo apunta a la BD de PRODUCCIÓN).

alter table public.booker_accounts
  add column if not exists tos_accepted_at timestamptz,
  add column if not exists tos_version text;

comment on column public.booker_accounts.tos_accepted_at is
  'Momento en que el booker aceptó Términos + Política de Privacidad (evidencia de consentimiento, Ley 21.719).';
comment on column public.booker_accounts.tos_version is
  'Versión de los documentos legales aceptada por el booker (ver src/lib/legal.ts).';
