-- 0051 — Nudge de onboarding incompleto.
-- Marca de tiempo de cuándo se le mandó al DJ el recordatorio de "termina tu
-- perfil" (one-shot). NULL = todavía no se le mandó. Permite que el cron sea
-- idempotente: no re-enviar a quien ya recibió el nudge.

alter table public.dj_profile
  add column if not exists onboarding_nudge_sent_at timestamptz;

comment on column public.dj_profile.onboarding_nudge_sent_at is
  'Cuándo se envió el recordatorio de onboarding incompleto (one-shot). NULL = no enviado.';
