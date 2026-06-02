-- ════════════════════════════════════════════════════════════════════
-- Migration 0033 — handle_new_user respeta a los bookers
-- ────────────────────────────────────────────────────────────────────
-- BUG pre-existente (nunca gatillado porque el signup booker está cerrado):
-- handle_new_user() creaba un dj_profile para TODO usuario nuevo, sin
-- distinguir bookers. Como el layout /booker redirige a /dashboard si el
-- user tiene dj_profile, un booker recién registrado caía en el onboarding
-- de DJ → el portal booker quedaba inalcanzable.
--
-- Fix: si el signup trae raw_user_meta_data.account_type = 'booker', NO
-- creamos dj_profile (el booker_account lo crea ensureBookerAccount en el
-- layout). Los DJs (sin account_type o != booker) siguen igual que antes,
-- incluido el registro de aceptación de Términos (migration 0031).
--
-- Prerequisito para abrir el lado booker (Fase 1). Hoy hay 0 bookers, así
-- que no hay data que migrar.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Bookers (Bloque B) NO tienen dj_profile — su cuenta vive en
  -- booker_accounts (creada por ensureBookerAccount en el layout).
  if coalesce(new.raw_user_meta_data ->> 'account_type', '') = 'booker' then
    return new;
  end if;

  insert into public.dj_profile (user_id, artist_name, tos_accepted_at, tos_version)
  values (
    new.id,
    '',
    case
      when (new.raw_user_meta_data ->> 'tos_accepted') = 'true' then now()
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'tos_version', '')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- El trigger on_auth_user_created ya apunta a esta función (migration 0001);
-- CREATE OR REPLACE no requiere recrearlo.

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0033 lista
-- ════════════════════════════════════════════════════════════════════
