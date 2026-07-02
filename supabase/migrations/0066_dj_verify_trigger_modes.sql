-- ════════════════════════════════════════════════════════════════════
-- Migration 0066 — trigger de verificación de DJs, DUAL-MODO por config
-- ────────────────────────────────────────────────────────────────────
-- Supersede 0064 (n8n) y 0065 (directo). Una sola función que elige el modo
-- según qué haya en private.integration_config — sin volver a tocar SQL si
-- cambias de opción:
--   • Modo n8n     → si existe 'n8n_dj_verify_url': POST a n8n con header
--                    'x-webhook-secret' = 'n8n_dj_verify_secret'.
--   • Modo directo → si NO hay url n8n pero existe 'dj_verify_secret': POST a
--                    /api/admin/dj-verify/evaluate con 'Authorization: Bearer'.
--   • Sin config   → no-op.
--
-- Guardia CRÍTICA (idéntica a 0064/0065): dispara SOLO si verified_at IS NULL
-- y cambió una columna de contenido. NUNCA por last_active_at (heartbeat).
--
-- Self-contained: correr SOLO este archivo deja todo listo (extensión/esquema/
-- tabla con IF NOT EXISTS; función y trigger con create-or-replace).
-- Los secretos van a mano en integration_config (NO en git).
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0066_dj_verify_trigger_modes.sql
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;

create schema if not exists private;

create table if not exists private.integration_config (
  key   text primary key,
  value text not null
);

create or replace function public.notify_dj_verify_candidate()
returns trigger
language plpgsql
security definer
set search_path = public, private, extensions, pg_temp
as $$
declare
  n8n_url       text;
  n8n_secret    text;
  direct_secret text;
  evaluate_url  constant text := 'https://dropgigs.com/api/admin/dj-verify/evaluate';
begin
  select value into n8n_url       from private.integration_config where key = 'n8n_dj_verify_url';
  select value into n8n_secret    from private.integration_config where key = 'n8n_dj_verify_secret';
  select value into direct_secret from private.integration_config where key = 'dj_verify_secret';

  if n8n_url is not null then
    -- Modo n8n: avisar al webhook, n8n llama a /evaluate.
    perform net.http_post(
      url     := n8n_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', coalesce(n8n_secret, '')
      ),
      body    := jsonb_build_object('user_id', new.user_id)
    );
  elsif direct_secret is not null then
    -- Modo directo: llamar a la app sin intermediario.
    perform net.http_post(
      url     := evaluate_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || direct_secret
      ),
      body    := jsonb_build_object('user_id', new.user_id)
    );
  end if;
  -- Sin config → no-op.

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
  'Migration 0066 — trigger dual-modo: usa n8n (n8n_dj_verify_url) o llama directo a /evaluate (dj_verify_secret), según private.integration_config. No dispara por last_active_at.';
