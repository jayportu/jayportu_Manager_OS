-- ════════════════════════════════════════════════════════════════════
-- Migration 0032 — Perfil de booker (Fase 1 del lado booker)
-- ────────────────────────────────────────────────────────────────────
-- Suma campos al booker_accounts para que el booker gestione su perfil:
-- sitio/IG, bio, toggles de directorio y pitches, y verificación manual.
--
-- Contexto: hoy booker_accounts solo guarda full_name/email/booker_type/
-- city/country/whatsapp/newsletter. El perfil editable (/booker/perfil)
-- necesita estos campos extra. El directorio de lugares y los pitches
-- (fases 3-4) los consumirán; acá solo capturamos la data.
--
-- SEGURIDAD: el booker puede editar su propio booker_accounts vía RLS.
-- Sin protección, podría hacer un UPDATE directo seteando verified_at y
-- falsear el badge "✓ Verificado por DROP.". El trigger
-- protect_booker_verification() revierte cualquier cambio a verified_at/
-- verified_by hecho por un rol != service_role. El admin verifica vía
-- createAdminClient() (service_role).
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Columnas nuevas ─────────────────────────────────────────────
alter table public.booker_accounts
  add column if not exists website_url    text not null default '',
  add column if not exists instagram_url  text not null default '',
  add column if not exists bio            text not null default '',
  add column if not exists in_directory   boolean not null default false,
  add column if not exists accepts_pitches boolean not null default false,
  add column if not exists verified_at    timestamptz,
  add column if not exists verified_by    uuid references auth.users(id) on delete set null;

-- Index para el directorio (fase 3): lugares visibles y verificados
create index if not exists idx_booker_accounts_directory
  on public.booker_accounts(in_directory)
  where in_directory = true and verified_at is not null;

-- ─── 2) Trigger anti auto-verificación ──────────────────────────────
create or replace function public.protect_booker_verification()
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

drop trigger if exists protect_booker_verification_trigger on public.booker_accounts;

create trigger protect_booker_verification_trigger
  before update on public.booker_accounts
  for each row
  execute function public.protect_booker_verification();

comment on function public.protect_booker_verification is
  'Migration 0032 — impide que un booker se auto-verifique vía UPDATE directo. Solo service_role (backoffice) puede setear verified_at/verified_by.';

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0032 lista
-- ════════════════════════════════════════════════════════════════════
