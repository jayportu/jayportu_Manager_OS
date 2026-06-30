-- 0062 · Correos de activación — banderas de dedup (one-shot)
--
-- Secuencia de activación (Resend, sobre wrapEmail):
--   E1 Bienvenida  → al completar el onboarding (welcome wizard)
--   E2 Nudge       → cron existente (onboarding_nudge_sent_at, ya existía)
--   E3 Press kit vivo → la primera vez que el press kit queda "live-ready"
--
-- Estas dos columnas evitan reenviar E1/E3 (igual patrón que
-- onboarding_nudge_sent_at). Las setea el server tras enviar; NO son
-- editables por el dueño (no van en EDITABLE_PROFILE_FIELDS).

alter table public.dj_profile
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists presskit_live_email_sent_at timestamptz;

comment on column public.dj_profile.welcome_email_sent_at is
  'Activación E1 (bienvenida): timestamp de envío. null = no enviado. One-shot.';
comment on column public.dj_profile.presskit_live_email_sent_at is
  'Activación E3 (press kit vivo): timestamp de envío al quedar live-ready. null = no enviado. One-shot.';
