-- ════════════════════════════════════════════════════════════════════
-- Migration 0068 — tasks (Fase 6 · Tareas)
-- ────────────────────────────────────────────────────────────────────
-- Gestor de tareas del DJ (lista + Kanban). Independiente de follow_ups
-- (que es CRM por contacto). Una tarea puede vincularse OPCIONALMENTE a un
-- contacto del CRM (on delete set null → la tarea sobrevive sin contacto).
--
-- Ejecutar en: Supabase Dashboard → SQL Editor → pegar y Run.
-- Aditiva: crea una tabla nueva, no toca datos existentes.
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text not null,
  notes      text,
  priority   text not null default 'normal' check (priority in ('alta','normal','baja')),
  status     text not null default 'por_hacer' check (status in ('por_hacer','en_progreso','hecho')),
  due_at     timestamptz,
  contact_id uuid references public.contacts(id) on delete set null,
  position   int  not null default 0,
  created_at timestamptz not null default now(),
  done_at    timestamptz
);

create index if not exists idx_tasks_user_status
  on public.tasks(user_id, status, position);
create index if not exists idx_tasks_user_due
  on public.tasks(user_id, due_at);

alter table public.tasks enable row level security;

-- El dueño ve/edita TODAS sus tareas. No hay lectura pública.
drop policy if exists tasks_owner_all on public.tasks;
create policy tasks_owner_all on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0068 lista
-- ════════════════════════════════════════════════════════════════════
