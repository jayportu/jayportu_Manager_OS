-- ════════════════════════════════════════════════════════════════════
-- Migration 0055 — Endurecimiento de seguridad (extras de la auditoría)
-- ────────────────────────────────────────────────────────────────────
-- Complementa a 0053_protect_is_admin.sql y 0054_protect_beta_status.sql (que
-- ya blindan is_admin + beta_status en el trigger protect_dj_verification).
-- Acá van SOLO las protecciones ortogonales de la auditoría 2026-06-13 que
-- esos dos NO cubren:
--
--   • INSERT guard en dj_profile: las protecciones de is_admin/beta_status son
--     BEFORE UPDATE. Faltaba el vector de INSERCIÓN directa — un booker (sin
--     dj_profile) podía POST /rest/v1/dj_profile {is_admin:true}. Este trigger
--     fuerza valores seguros en todo insert que NO sea service_role.
--   • H2: emit_availability_update_event() era SECURITY DEFINER sin search_path
--     fijo → secuestrable. Lo fijamos (era la única función definer así).
--   • M1/M2: platform_accounts y venue_pitches tenían UPDATE con USING pero sin
--     WITH CHECK → el dueño podía "donar" la fila a otro usuario. Agregamos
--     WITH CHECK.
--
-- Idempotente. Ya aplicada a PROD el 2026-06-13 (verificada). Este archivo la
-- deja registrada y reproducible en entornos nuevos / preview.
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0055_security_hardening_extras.sql
-- ════════════════════════════════════════════════════════════════════

-- ─── INSERT guard: cerrar la inserción directa de un dj_profile privilegiado ─
create or replace function public.protect_dj_privileged_insert()
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

  -- Defaults seguros para inserts del lado cliente. El insert legítimo lo hace
  -- handle_new_user (SECURITY DEFINER) con estos mismos defaults → no-op ahí.
  new.is_admin := false;
  new.beta_status := 'none';
  new.verified_at := null;
  new.verified_by := null;
  new.verifications := array[]::text[];
  new.is_drop_pick := false;
  new.drop_pick_priority := 0;
  new.account_status := 'active';

  return new;
end;
$$;

drop trigger if exists trg_dj_protect_privileged_insert on public.dj_profile;
create trigger trg_dj_protect_privileged_insert
  before insert on public.dj_profile
  for each row execute function public.protect_dj_privileged_insert();

-- ─── H2 · Fijar search_path en función SECURITY DEFINER ──────────────────────
create or replace function public.emit_availability_update_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.available_from is distinct from old.available_from
     or new.available_until is distinct from old.available_until
     or new.available_note is distinct from old.available_note then
    insert into public.dj_update_events (dj_user_id, type, payload)
    values (
      new.user_id,
      'availability_updated',
      jsonb_build_object(
        'available_from', new.available_from,
        'available_until', new.available_until,
        'available_note', new.available_note
      )
    );
  end if;
  return new;
end;
$$;

-- ─── M1 · platform_accounts UPDATE: agregar WITH CHECK ───────────────────────
drop policy if exists "own_platform_accounts_update" on public.platform_accounts;
create policy "own_platform_accounts_update" on public.platform_accounts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── M2 · venue_pitches UPDATE (booker): agregar WITH CHECK ──────────────────
drop policy if exists venue_pitches_update_booker on public.venue_pitches;
create policy venue_pitches_update_booker on public.venue_pitches
  for update using (auth.uid() = booker_user_id) with check (auth.uid() = booker_user_id);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0055 lista
-- ════════════════════════════════════════════════════════════════════
