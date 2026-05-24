-- ════════════════════════════════════════════════════════════════════
-- Migration 0014 — admin role
-- ────────────────────────────────────────────────────────────────────
-- Agrega columna `is_admin` a dj_profile. Users con is_admin=true ven
-- el item "Admin" en el sidebar y pueden acceder a /admin con métricas
-- globales y listado de todos los users.
--
-- Diseño: 1 sola tabla (no se separa en admin_users) porque Jaime usa
-- la app tanto de admin como de DJ. Es un flag adicional al user, no
-- una identidad distinta.
--
-- Backfill: marcamos como admin a Jaime (hola@jayportu.com) por su id.
-- El resto de usuarios queda con is_admin=false por default.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.dj_profile
  add column if not exists is_admin boolean not null default false;

-- Backfill: Jaime es admin
update public.dj_profile
  set is_admin = true
  where user_id = (
    select id from auth.users where email = 'hola@jayportu.com' limit 1
  );

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0014 lista
-- ════════════════════════════════════════════════════════════════════
