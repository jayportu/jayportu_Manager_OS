-- 0067_security_audit_log.sql
-- BL-03 (auditoría de privacidad · Ley 21.719).
--
-- Registro de auditoría de seguridad, APPEND-ONLY. Habilita el deber de poder
-- reconstruir "qué pasó / a quién afectó" ante una vulneración de seguridad
-- (deber de reportar del art. 14 y ss.) y deja traza de acciones sensibles del
-- backoffice y de exportaciones de datos personales.
--
-- RLS: habilitado SIN policies -> deny-all para anon/authenticated. Solo el
-- service_role (server-side) escribe/lee, igual que las otras tablas de
-- backoffice (email_campaigns, inbound_emails, site_events). No se expone vía
-- PostgREST a usuarios finales.
--
-- NO destructiva. No aplicar en producción sin autorización explícita
-- (el .env.local del repo apunta a la BD de PRODUCCIÓN).

create table if not exists public.security_audit_log (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  -- Quién hizo la acción. NULL = sistema / service_role / cambio por SQL manual.
  actor_user_id uuid references auth.users(id) on delete set null,
  -- Verbo del evento, namespaced. Ej: 'admin.user_deleted',
  -- 'admin.account_status_changed', 'admin.dj_verified', 'data.export',
  -- 'auth.is_admin_changed'.
  action        text not null,
  target_type   text,
  target_id     text,
  metadata      jsonb not null default '{}'::jsonb,
  ip            text,
  user_agent    text
);

comment on table public.security_audit_log is
  'Registro append-only de eventos de seguridad/privacidad. Solo service_role (RLS deny-all). No borrar filas.';

create index if not exists security_audit_log_created_at_idx
  on public.security_audit_log (created_at desc);
create index if not exists security_audit_log_action_idx
  on public.security_audit_log (action);
create index if not exists security_audit_log_actor_idx
  on public.security_audit_log (actor_user_id);

-- RLS deny-all (sin policies). service_role bypasea RLS.
alter table public.security_audit_log enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- Trigger catch-all: registra CUALQUIER cambio de is_admin en dj_profile,
-- incluso si se hace por SQL manual (no solo desde la app). SECURITY DEFINER
-- para poder insertar en la tabla con RLS activo; search_path fijado (patrón
-- de hardening de la migración 0058).
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.log_is_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(old.is_admin, false) is distinct from coalesce(new.is_admin, false) then
    insert into public.security_audit_log
      (actor_user_id, action, target_type, target_id, metadata)
    values (
      auth.uid(),
      'auth.is_admin_changed',
      'dj_profile',
      new.user_id::text,
      jsonb_build_object(
        'from', coalesce(old.is_admin, false),
        'to',   coalesce(new.is_admin, false)
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_is_admin_change on public.dj_profile;
create trigger trg_log_is_admin_change
  after update of is_admin on public.dj_profile
  for each row execute function public.log_is_admin_change();
