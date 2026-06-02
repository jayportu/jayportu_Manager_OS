-- ════════════════════════════════════════════════════════════════════
-- Migration 0031 — aceptación de Términos y Condiciones (click-wrap)
-- ────────────────────────────────────────────────────────────────────
-- Registra cuándo y qué versión de los Términos aceptó cada usuario al
-- crear su cuenta. Hace que el click-wrap sea legalmente trazable
-- (timestamp + versión + user_id), como recomienda la Ley 19.799 y la
-- práctica estándar SaaS.
--
-- Dos caminos de registro:
--   1) Signup email/password: el form manda raw_user_meta_data con
--      tos_accepted='true' + tos_version. El trigger handle_new_user()
--      (actualizado abajo) escribe tos_accepted_at=now() + tos_version
--      en dj_profile al crear la fila. → registrado en el momento exacto
--      de creación de la cuenta.
--   2) Google OAuth (no carga metadata fácil) + cualquier edge: el
--      onboarding /welcome exige el checkbox y registra la aceptación
--      vía completeOnboarding() si tos_accepted_at sigue null.
--
-- now() (server-side) en vez de parsear un timestamp del cliente: evita
-- que un metadata malformado rompa el signup.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Columnas ────────────────────────────────────────────────────
alter table public.dj_profile
  add column if not exists tos_accepted_at timestamptz,
  add column if not exists tos_version text;

-- ─── 2) Trigger handle_new_user: registrar TOS al crear la cuenta ───
-- Preserva el comportamiento original (crear dj_profile con artist_name
-- vacío) y suma el registro de aceptación desde la metadata del signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
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

-- El trigger on_auth_user_created ya existe (migration 0001) apuntando a
-- esta función; al hacer CREATE OR REPLACE no hay que recrearlo.

comment on column public.dj_profile.tos_accepted_at is
  'Migration 0031 — timestamp de aceptación de los Términos (click-wrap). null = no aceptó aún.';
comment on column public.dj_profile.tos_version is
  'Migration 0031 — versión de los Términos aceptada (ej. 2026-06-02). Se compara contra TOS_VERSION en src/lib/legal.ts.';

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0031 lista
-- ════════════════════════════════════════════════════════════════════
