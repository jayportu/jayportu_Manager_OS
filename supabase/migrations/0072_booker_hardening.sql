-- ════════════════════════════════════════════════════════════════════
-- Migration 0072 — Booker hardening (F0 · PR-B) · INSERT guard + RLS
-- ────────────────────────────────────────────────────────────────────
-- Cierra en la BASE DE DATOS las brechas que el guard de aplicación
-- (PR-A · assertBookerActive) no puede cubrir por sí solo, porque un cliente
-- puede saltarse la capa app hablando PostgREST directo:
--
--   • S3 — Escalada de privilegios por INSERT directo en booker_accounts:
--     un usuario podía  POST /rest/v1/booker_accounts
--     { verified_at, is_founding, account_status:'active' }  y auto-verificarse
--     / auto-marcarse founding. Solo existía protección BEFORE UPDATE
--     (0032/0044/0063), no BEFORE INSERT. Se porta el patrón de dj_profile
--     (0055 · protect_dj_privileged_insert) a booker_accounts.
--
--   • S2 — RLS de open_gigs INSERT solo exigía  auth.uid() = booker_user_id
--     (0069:37-38): cualquier usuario autenticado —incluso un DJ sin cuenta
--     booker— podía publicar convocatorias sin verificación. Ahora la RLS exige
--     cuenta booker VERIFICADA y ACTIVA. UPDATE/DELETE exigen cuenta ACTIVA (un
--     booker suspendido/baneado queda congelado también en DB, no solo en la
--     UI). gig_applications UPDATE del booker exige cuenta activa.
--
-- service_role bypassa toda RLS y el trigger → el backoffice (/admin) y el
-- consumo de founding invite siguen operando sin cambios.
--
-- Idempotente. Aditiva. NO borra datos.
-- Ejecutar en: Supabase Dashboard → SQL Editor
--   (o: node scripts/run_migration.mjs supabase/migrations/0072_booker_hardening.sql)
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) S3 · INSERT guard en booker_accounts ────────────────────────────────
-- Fuerza valores seguros en columnas privilegiadas para cualquier INSERT que no
-- sea service_role. El insert legítimo (ensureBookerAccount, rol authenticated)
-- NO setea estas columnas → no-op funcional; solo blinda el POST directo.
create or replace function public.protect_booker_privileged_insert()
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

  -- service_role (backoffice / consumo de founding invite) pasa sin tocar.
  if caller_role = 'service_role' then
    return new;
  end if;

  new.verified_at               := null;
  new.verified_by               := null;
  new.is_founding               := false;
  new.founding_since            := null;
  new.account_status            := 'active';
  new.account_status_reason     := null;
  new.account_status_changed_at := null;
  new.account_status_changed_by := null;

  return new;
end;
$$;

drop trigger if exists trg_booker_protect_privileged_insert on public.booker_accounts;
create trigger trg_booker_protect_privileged_insert
  before insert on public.booker_accounts
  for each row execute function public.protect_booker_privileged_insert();

comment on function public.protect_booker_privileged_insert() is
  'F0/S3 — impide auto-setear verified_*/is_founding/founding_since/account_status* vía INSERT directo en booker_accounts. Solo service_role puede fijarlos (backoffice / consumo de founding invite). Complementa los triggers BEFORE UPDATE de 0032/0044/0063.';

-- ─── 2) S2 · RLS de open_gigs: publicar exige verificado + activo ────────────
-- El EXISTS lee la propia fila de booker_accounts (RLS select-own la permite).
drop policy if exists open_gigs_insert on public.open_gigs;
create policy open_gigs_insert on public.open_gigs
  for insert with check (
    auth.uid() = booker_user_id
    and exists (
      select 1 from public.booker_accounts b
      where b.user_id = auth.uid()
        and b.verified_at is not null
        and b.account_status = 'active'
    )
  );

-- UPDATE/DELETE: dueño + cuenta activa (congela al suspendido/baneado en DB).
-- Se añade WITH CHECK espejo del USING (el 0069 no lo tenía → un dueño podía
-- reasignar la fila; misma clase de bug M1/M2 que cerró 0055).
drop policy if exists open_gigs_update on public.open_gigs;
create policy open_gigs_update on public.open_gigs
  for update using (
    auth.uid() = booker_user_id
    and exists (
      select 1 from public.booker_accounts b
      where b.user_id = auth.uid() and b.account_status = 'active'
    )
  ) with check (
    auth.uid() = booker_user_id
    and exists (
      select 1 from public.booker_accounts b
      where b.user_id = auth.uid() and b.account_status = 'active'
    )
  );

drop policy if exists open_gigs_delete on public.open_gigs;
create policy open_gigs_delete on public.open_gigs
  for delete using (
    auth.uid() = booker_user_id
    and exists (
      select 1 from public.booker_accounts b
      where b.user_id = auth.uid() and b.account_status = 'active'
    )
  );

-- open_gigs_select se mantiene igual (0069): status='open' OR dueño. Sin cambios
-- (un suspendido puede seguir LEYENDO; lo que se bloquea es escribir).

-- ─── 3) gig_applications: el booker decide solo si su cuenta está activa ─────
-- El DJ postulante conserva insert/select/delete sin cambios (0069). El vector
-- nuevo es un booker suspendido decidiendo (accept/reject) postulaciones.
drop policy if exists gig_apps_update_booker on public.gig_applications;
create policy gig_apps_update_booker on public.gig_applications
  for update using (
    exists (
      select 1
      from public.open_gigs g
      join public.booker_accounts b on b.user_id = g.booker_user_id
      where g.id = open_gig_id
        and g.booker_user_id = auth.uid()
        and b.account_status = 'active'
    )
  );

-- ════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (correr manualmente tras aplicar)
-- ════════════════════════════════════════════════════════════════════
-- (a) Políticas presentes con las nuevas condiciones:
--     select policyname, cmd, qual, with_check
--       from pg_policies
--      where schemaname='public' and tablename in ('open_gigs','gig_applications')
--      order by tablename, policyname;
--
-- (b) Trigger BEFORE INSERT presente:
--     select tgname, tgtype from pg_trigger
--      where tgrelid = 'public.booker_accounts'::regclass and not tgisinternal;
--
-- (c) INSERT guard (como authenticated, NO service_role): un INSERT que intente
--     verified_at=now()/is_founding=true/account_status='active' debe quedar con
--     verified_at IS NULL, is_founding=false (account_status ya default 'active').
--
-- (d) RLS open_gigs: con un booker NO verificado o suspendido, el INSERT debe
--     fallar ("new row violates row-level security policy"); con verificado +
--     activo debe insertar OK.

-- ════════════════════════════════════════════════════════════════════
-- REVERSIÓN (volver al estado 0069) — descomentar y ejecutar si hiciera falta
-- ════════════════════════════════════════════════════════════════════
-- drop trigger if exists trg_booker_protect_privileged_insert on public.booker_accounts;
-- drop function if exists public.protect_booker_privileged_insert();
--
-- drop policy if exists open_gigs_insert on public.open_gigs;
-- create policy open_gigs_insert on public.open_gigs
--   for insert with check (auth.uid() = booker_user_id);
--
-- drop policy if exists open_gigs_update on public.open_gigs;
-- create policy open_gigs_update on public.open_gigs
--   for update using (auth.uid() = booker_user_id) with check (auth.uid() = booker_user_id);
--
-- drop policy if exists open_gigs_delete on public.open_gigs;
-- create policy open_gigs_delete on public.open_gigs
--   for delete using (auth.uid() = booker_user_id);
--
-- drop policy if exists gig_apps_update_booker on public.gig_applications;
-- create policy gig_apps_update_booker on public.gig_applications
--   for update using (exists (select 1 from public.open_gigs g
--     where g.id = open_gig_id and g.booker_user_id = auth.uid()));

-- ✓ Migration 0072 lista
