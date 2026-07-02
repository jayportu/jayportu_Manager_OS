-- ════════════════════════════════════════════════════════════════════
-- Migration 0064 — trigger event-driven de verificación de DJs → n8n
-- ────────────────────────────────────────────────────────────────────
-- Cuando un DJ NO verificado cambia una columna relevante de su perfil,
-- avisa a n8n (POST async vía pg_net) para que llame a /api/admin/dj-verify/
-- evaluate y lo verifique si cumple 4/4.
--
-- Guardia CRÍTICA: dispara SOLO si verified_at IS NULL y cambió una columna
-- de contenido. NUNCA por last_active_at (heartbeat de presencia, ~cada 60s)
-- ni por los propios campos de verificación → sin tormenta ni loops.
--
-- La URL y el secret del webhook viven en private.integration_config
-- (seteados a mano, no en este archivo) para no commitear secretos.
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0064_dj_verify_auto_trigger.sql
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;

create schema if not exists private;

create table if not exists private.integration_config (
  key   text primary key,
  value text not null
);
-- Seed (correr a mano, NO en git):
--   insert into private.integration_config (key, value) values
--     ('n8n_dj_verify_url', 'https://<tu-n8n>/webhook/dj-verify'),
--     ('n8n_dj_verify_secret', '<secreto-inbound-n8n>')
--   on conflict (key) do update set value = excluded.value;

create or replace function public.notify_dj_verify_candidate()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  webhook_url text;
  webhook_secret text;
begin
  select value into webhook_url   from private.integration_config where key = 'n8n_dj_verify_url';
  select value into webhook_secret from private.integration_config where key = 'n8n_dj_verify_secret';

  -- Sin config → no-op (permite montar el trigger antes de tener n8n listo).
  if webhook_url is null then
    return new;
  end if;

  perform net.http_post(
    url     := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(webhook_secret, '')
    ),
    body    := jsonb_build_object('user_id', new.user_id)
  );

  return new;
end;
$$;

drop trigger if exists dj_verify_notify_trigger on public.dj_profile;

create trigger dj_verify_notify_trigger
  after update on public.dj_profile
  for each row
  when (
    old.verified_at is null
    and (
      new.avatar_url             is distinct from old.avatar_url
      or new.bio_short           is distinct from old.bio_short
      or new.genres              is distinct from old.genres
      or new.instagram_url       is distinct from old.instagram_url
      or new.soundcloud_url      is distinct from old.soundcloud_url
      or new.featured_sets       is distinct from old.featured_sets
      or new.press_kit_mode      is distinct from old.press_kit_mode
      or new.press_kit_pdf_url   is distinct from old.press_kit_pdf_url
      or new.public_slug         is distinct from old.public_slug
      or new.onboarding_completed_at is distinct from old.onboarding_completed_at
    )
  )
  execute function public.notify_dj_verify_candidate();

comment on function public.notify_dj_verify_candidate is
  'Migration 0064 — avisa a n8n (pg_net) cuando un DJ no verificado cambia una columna relevante de su perfil, para reevaluar la verificación automática. No dispara por last_active_at.';
