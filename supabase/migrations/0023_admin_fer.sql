-- ════════════════════════════════════════════════════════════════════
-- Migration 0023 — admin: Fer
-- ────────────────────────────────────────────────────────────────────
-- Marca como admin a Fer (canezzafda@gmail.com), con los mismos
-- privilegios que Jaime: ve el item "Admin" en el sidebar y accede a
-- /admin con métricas globales y listado de todos los users.
--
-- Requisito: Fer debe tener cuenta creada (registrada al menos una vez)
-- para que exista su fila en auth.users y en dj_profile. Si todavía no
-- se registró, este UPDATE no afecta filas; volvé a ejecutarlo después
-- de su primer login.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

update public.dj_profile
  set is_admin = true
  where user_id = (
    select id from auth.users where email = 'canezzafda@gmail.com' limit 1
  );

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0023 lista
-- ════════════════════════════════════════════════════════════════════
