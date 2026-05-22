-- ════════════════════════════════════════════════════════════════════
-- Migration 0004 — ai_outputs (historial de IA + caché)
-- ════════════════════════════════════════════════════════════════════
-- Guarda cada output de IA (ya sea Ollama local o ChatGPT manual)
-- para:
--  · Historial revisable
--  · Cache (no re-llamar IA si nada cambió)
--  · Análisis de qué prompts funcionan mejor
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.ai_outputs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- De dónde vino
  source        text not null
                check (source in ('ollama', 'chatgpt_manual', 'paste')),
  model         text default '',

  -- Qué tipo de output
  kind          text not null
                check (kind in (
                  'summarize_contact',
                  'suggest_reply',
                  'refine_score',
                  'idea_content',
                  'classify_intent',
                  'extract_data',
                  'other'
                )),

  -- Contexto
  related_type  text default '',     -- "contact", "interaction", "campaign", etc.
  related_id    uuid,

  -- Input/output
  input_json    jsonb default '{}'::jsonb,
  output        text not null default '',

  -- Estado
  saved_as      text default '',     -- "note", "suggested_message", etc. cuando Jaime guarda

  created_at    timestamptz not null default now()
);

create index if not exists idx_ai_outputs_user_at
  on public.ai_outputs(user_id, created_at desc);
create index if not exists idx_ai_outputs_related
  on public.ai_outputs(user_id, related_type, related_id, kind, created_at desc);

-- RLS
alter table public.ai_outputs enable row level security;

drop policy if exists "ai_outputs_select_own" on public.ai_outputs;
create policy "ai_outputs_select_own" on public.ai_outputs
  for select using (auth.uid() = user_id);

drop policy if exists "ai_outputs_insert_own" on public.ai_outputs;
create policy "ai_outputs_insert_own" on public.ai_outputs
  for insert with check (auth.uid() = user_id);

drop policy if exists "ai_outputs_update_own" on public.ai_outputs;
create policy "ai_outputs_update_own" on public.ai_outputs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "ai_outputs_delete_own" on public.ai_outputs;
create policy "ai_outputs_delete_own" on public.ai_outputs
  for delete using (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0004 lista
-- ════════════════════════════════════════════════════════════════════
