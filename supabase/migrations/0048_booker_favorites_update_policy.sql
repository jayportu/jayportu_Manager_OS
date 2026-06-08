-- ════════════════════════════════════════════════════════════════════
-- Migration 0048 — Policy de UPDATE para booker_favorites (RA-6 fix)
-- ────────────────────────────────────────────────────────────────────
-- booker_favorites tenía policies de SELECT/INSERT/DELETE (0021) pero
-- NINGUNA de UPDATE. Con RLS activo, eso deniega todo UPDATE en silencio
-- (0 filas afectadas, sin error) → `toggleFollowNotifyAction` nunca pudo
-- flippear `notify_email` de un favorito existente, así que prender/apagar
-- los avisos por email (el corazón del loop de seguidores, RA-3/RA-6) no
-- funcionaba. Esta policy lo habilita, scoped al dueño.
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0048_booker_favorites_update_policy.sql
-- ════════════════════════════════════════════════════════════════════

drop policy if exists "booker_favorites_update_own" on public.booker_favorites;
create policy "booker_favorites_update_own" on public.booker_favorites
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
