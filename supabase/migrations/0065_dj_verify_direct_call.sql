-- ════════════════════════════════════════════════════════════════════
-- Migration 0065 — verificación de DJs SIN n8n (Postgres llama directo a la app)
-- ────────────────────────────────────────────────────────────────────
-- Supersede la función de 0064: en vez de avisar a n8n, el trigger llama
-- DIRECTO al endpoint /api/admin/dj-verify/evaluate de DROP (pg_net, async).
-- Se saca n8n del medio — toda la lógica ya vive en la app.
--
-- Guardia CRÍTICA (idéntica a 0064): dispara SOLO si verified_at IS NULL y
-- cambió una columna de contenido. NUNCA por last_active_at (heartbeat) ni por
-- los campos de verificación → sin tormenta ni loops.
--
-- Config: solo el SECRET vive en private.integration_config (key 'dj_verify_secret'),
-- seteado a mano (NO en git). Debe ser IGUAL al DJ_VERIFY_SECRET de Vercel.
-- La URL del endpoint es fija (prod), no es secreta.
--
-- Self-contained: se puede correr aunque 0064 nunca se haya aplicado
-- (extensión/esquema/tabla van con IF NOT EXISTS).
--
-- Ejecutar en: node scripts/run_migration.mjs supabase/migrations/0065_dj_verify_direct_call.sql
-- Seed del secret (a mano, NO en git):
--   insert into private.integration_config (key, value)
--     values ('dj_verify_secret', '<mismo valor que DJ_VERIFY_SECRET en Vercel>')
--   on conflict (key) do update set value = excluded.value;
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
  verify_secret text;
  evaluate_url constant text := 'https://dropgigs.com/api/admin/dj-verify/evaluate';
begin
  select value into verify_secret from private.integration_config where key = 'dj_verify_secret';

  -- Sin secret → no-op (permite montar el trigger antes de configurar el secret).
  if verify_secret is null then
    return new;
  end if;

  -- Llama directo a la app; async (pg_net encola y retorna), no bloquea el guardado.
  perform net.http_post(
    url     := evaluate_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || verify_secret
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
  'Migration 0065 — el trigger llama DIRECTO a /api/admin/dj-verify/evaluate (sin n8n) cuando un DJ no verificado cambia una columna relevante. Secret en private.integration_config (dj_verify_secret). No dispara por last_active_at.';
