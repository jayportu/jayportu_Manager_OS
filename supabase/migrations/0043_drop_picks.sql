-- ════════════════════════════════════════════════════════════════════
-- Migration 0043 — DROP Picks (Fase 1 · RA-2A)
-- ────────────────────────────────────────────────────────────────────
-- Curaduría admin: fila "DROP PICKS" arriba de /dj + badge "PICK".
-- is_drop_pick gobierna; drop_pick_priority ordena (mayor = más arriba).
-- Igual que verified/verifications: solo service_role (admin) puede tocarlos
-- — extendemos protect_dj_verification para blindar también estas columnas.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists is_drop_pick       boolean not null default false,
  add column if not exists drop_pick_priority integer not null default 0;

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

  if caller_role = 'service_role' then
    return new;
  end if;

  if new.verified_at is distinct from old.verified_at
     or new.verified_by is distinct from old.verified_by
  then
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  if new.verifications is distinct from old.verifications then
    new.verifications := old.verifications;
  end if;
  if new.is_drop_pick is distinct from old.is_drop_pick
     or new.drop_pick_priority is distinct from old.drop_pick_priority
  then
    new.is_drop_pick := old.is_drop_pick;
    new.drop_pick_priority := old.drop_pick_priority;
  end if;

  return new;
end;
$$;
