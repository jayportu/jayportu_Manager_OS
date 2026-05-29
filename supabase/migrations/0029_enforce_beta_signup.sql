-- 0029_enforce_beta_signup.sql
-- Sprint S20 — Cierre del signup abierto.
--
-- Contexto: hasta hoy /login dejaba a cualquier visitante crear cuenta vía
-- supabase.auth.signUp() directo (ver login-form.tsx). La UI escondida es
-- solo cosmética: cualquiera con DevTools podía bypass-arla. Esto explicó
-- el caso de cifratalo@gmail.com (cuenta huérfana, sin beta_request, en
-- estado "pendiente" en el backoffice).
--
-- Este trigger es la defensa real a nivel DB:
--   BEFORE INSERT en auth.users → rechaza si el email no está aprobado.
--
-- Excepciones que se mantienen libres:
--   1) service_role (admin SDK del backoffice, cron jobs, seeds de test)
--   2) Bookers (account_type='booker' en user_metadata) — Bloque B es un
--      flow público distinto: venues/productoras/agencias se registran
--      para reservar DJs, NO necesitan estar en la waitlist de DJs.
--
-- Idempotente: re-correr no rompe nada.

create or replace function public.enforce_beta_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  caller_role text;
  account_type text;
  is_approved boolean;
begin
  -- ─── 1) Service role: backoffice / cron / seeds ────────────────────
  -- Cuando admin.auth.admin.createUser() corre desde el server con la
  -- service key, el JWT trae role='service_role'. Lo dejamos pasar para
  -- no romper herramientas internas ni futuras funciones admin.
  caller_role := coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role',
    ''
  );
  if caller_role = 'service_role' then
    return new;
  end if;

  -- ─── 2) Bookers: flow público separado ─────────────────────────────
  -- BookerSignupForm setea raw_user_meta_data.account_type='booker'.
  -- Esos no son DJs, no necesitan beta_request.
  account_type := coalesce(new.raw_user_meta_data ->> 'account_type', '');
  if account_type = 'booker' then
    return new;
  end if;

  -- ─── 3) DJs: exigir beta_requests.status='approved' ────────────────
  if new.email is null or length(trim(new.email)) = 0 then
    raise exception 'Signup bloqueado: falta email en auth.users insert'
      using errcode = 'P0001';
  end if;

  select exists (
    select 1
    from public.beta_requests br
    where lower(br.email) = lower(new.email)
      and br.status = 'approved'
  ) into is_approved;

  if is_approved then
    return new;
  end if;

  raise exception
    'Signup bloqueado: el email % no está aprobado para la beta de DROP. Para solicitar acceso visita https://dropgigs.com/beta',
    new.email
    using errcode = 'P0001';
end;
$$;

-- CREATE TRIGGER no soporta IF NOT EXISTS, así que dropeamos primero.
drop trigger if exists enforce_beta_signup_trigger on auth.users;

create trigger enforce_beta_signup_trigger
  before insert on auth.users
  for each row
  execute function public.enforce_beta_signup();

comment on function public.enforce_beta_signup is
  'Sprint S20 — bloquea inserts a auth.users si el email no está en beta_requests.status=approved. Exento: service_role y bookers (account_type=booker).';
