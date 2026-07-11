-- ════════════════════════════════════════════════════════════════════
-- Migration 0070 — Convocatorias hardening (fast-follows de Fase 8)
-- ────────────────────────────────────────────────────────────────────
-- (1) Congela columnas inmutables de gig_applications: la RLS solo puede
--     restringir POR FILA, no por columna, así que un booker dueño del gig
--     podría (vía API directa) reescribir dj_user_id/message/etc. Este
--     trigger revierte cualquier cambio a esas columnas — solo status y
--     viewed_at quedan editables.
-- (4) updated_at automático en open_gigs (antes solo se seteaba a mano en
--     closeGig).
-- Ejecutar en: Supabase Dashboard → SQL Editor. Aditiva (solo triggers).
-- ════════════════════════════════════════════════════════════════════

-- (1) Freeze de columnas inmutables en gig_applications ────────────────
create or replace function public.freeze_gig_application_columns()
returns trigger language plpgsql as $$
begin
  new.open_gig_id     := old.open_gig_id;
  new.dj_user_id      := old.dj_user_id;
  new.dj_display_name := old.dj_display_name;
  new.dj_slug         := old.dj_slug;
  new.message         := old.message;
  new.availability    := old.availability;
  new.created_at      := old.created_at;
  return new;
end;
$$;

drop trigger if exists trg_freeze_gig_application_columns on public.gig_applications;
create trigger trg_freeze_gig_application_columns
  before update on public.gig_applications
  for each row execute function public.freeze_gig_application_columns();

-- (4) updated_at automático en open_gigs ───────────────────────────────
drop trigger if exists trg_open_gigs_updated_at on public.open_gigs;
create trigger trg_open_gigs_updated_at
  before update on public.open_gigs
  for each row execute function public.set_updated_at();

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0070 lista
-- ════════════════════════════════════════════════════════════════════
