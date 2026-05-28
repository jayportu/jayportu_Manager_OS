-- ════════════════════════════════════════════════════════════════════
-- Migration 0026 — Sprint RA-3 · Seguir + notificaciones por email
-- ────────────────────────────────────────────────────────────────────
-- Extiende `booker_favorites` para soportar la noción de "follow con
-- avisos por email". Un booker puede:
--   - ❤️ Favoritar un DJ (row en booker_favorites) sin avisos → silencioso.
--   - 🔔 Activar avisos sobre un DJ favoriteado (notify_email = true) →
--        recibe email cuando el DJ agenda un show o publica disponibilidad.
--
-- También agregamos `last_read_at` para saber qué updates en el feed
-- del booker (/booker/seguidos) ya fueron vistas — borde naranja en cards
-- no leídas.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

alter table public.booker_favorites
  add column if not exists notify_email boolean not null default false;

alter table public.booker_favorites
  add column if not exists last_read_at timestamptz default null;

-- Index para el cron job que va a buscar followers con notify_email=true
-- por DJ.
create index if not exists idx_booker_favorites_dj_notify
  on public.booker_favorites(dj_user_id)
  where notify_email = true;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0026 lista
-- ════════════════════════════════════════════════════════════════════
