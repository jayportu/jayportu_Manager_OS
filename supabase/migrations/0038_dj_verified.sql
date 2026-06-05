-- ════════════════════════════════════════════════════════════════════
-- Migration 0038 — dj_profile.verified_at (Fase 1 · 1A · Perfil verificado)
-- ────────────────────────────────────────────────────────────────────
-- Badge "✓ Verificado" curado por admin (estilo RA). Le baja el riesgo al
-- booker: ve de un vistazo qué DJs DROP. ya validó. Verificación MANUAL
-- desde /admin (curaduría), no automática.
--
-- Igual que bookers (0032): un DJ NO puede auto-verificarse. El UPDATE de
-- verified_* va con service_role (createAdminClient); el trigger
-- protect_dj_verification() revierte cambios desde cualquier otro rol — el
-- DJ edita su propio dj_profile vía RLS, así que sin esto podría setear
-- verified_at por su cuenta.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists verified_at timestamptz,
  add column if not exists verified_by uuid references auth.users(id) on delete set null;

create or replace function public.protect_dj_verification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_role text;
begin
  caller_role := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  );

  -- service_role (backoffice admin) puede verificar
  if caller_role = 'service_role' then
    return new;
  end if;

  -- Cualquier otro rol: no puede tocar los campos de verificación
  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
  then
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_dj_verification_trigger on public.dj_profile;

create trigger protect_dj_verification_trigger
  before update on public.dj_profile
  for each row
  execute function public.protect_dj_verification();

comment on function public.protect_dj_verification is
  'Migration 0038 — impide que un DJ se auto-verifique vía UPDATE directo a su dj_profile. Solo service_role (backoffice) puede setear verified_at/verified_by.';
