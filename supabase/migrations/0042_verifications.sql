-- ════════════════════════════════════════════════════════════════════
-- Migration 0042 — confiabilidad granular (Fase 1 · 1F)
-- ────────────────────────────────────────────────────────────────────
-- verifications: chequeos manuales otorgados por admin ('identity',
-- 'socials', 'sets'). El "historial" se calcula de los gigs (no se guarda).
-- Extiende protect_dj_verification (0038) para blindar también esta columna:
-- un DJ NO puede auto-otorgarse chequeos (solo service_role).
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists verifications text[] not null default '{}'::text[];

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
  if new.verifications is distinct from old.verifications then
    new.verifications := old.verifications;
  end if;

  return new;
end;
$$;
