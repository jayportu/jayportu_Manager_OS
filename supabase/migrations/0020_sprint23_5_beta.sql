-- 0020 · Sprint 23.5 — Beta 15 días
--
-- Cuatro bloques:
--   B1 · beta_requests (formulario público + workflow admin)
--   B2 · feedback_reports (widget flotante)
--   B3 · nps_responses (día 7 + día 15)
--   B4 · usage_events (analytics tracking)
--   B5 · dj_profile: beta_status + beta_approved_at + beta_request_id

------------------------------------------------------------
-- B1 · beta_requests
------------------------------------------------------------
-- Formulario público /beta. Cualquiera puede insertar (vía service_role
-- en server action). RLS strict: solo admin lee/edita.

create table if not exists public.beta_requests (
  id               uuid primary key default gen_random_uuid(),
  artist_name      text not null,
  email            text not null,
  instagram        text not null default '',
  city             text not null default '',
  genres           text[] not null default '{}',
  motivation       text not null default '',
  status           text not null default 'new'
    check (status in ('new', 'approved', 'rejected', 'waitlist')),
  invite_token     uuid default null,
  invite_sent_at   timestamptz default null,
  approved_at      timestamptz default null,
  rejected_at      timestamptz default null,
  reject_reason    text not null default '',
  user_id          uuid references auth.users(id) on delete set null,
  ip_address       inet default null,
  user_agent       text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_beta_requests_status
  on public.beta_requests (status, created_at desc);
create index if not exists idx_beta_requests_email
  on public.beta_requests (lower(email));
create unique index if not exists idx_beta_requests_invite_token
  on public.beta_requests (invite_token)
  where invite_token is not null;

drop trigger if exists trg_beta_requests_updated_at on public.beta_requests;
create trigger trg_beta_requests_updated_at
  before update on public.beta_requests
  for each row execute function public.set_updated_at();

alter table public.beta_requests enable row level security;

-- Insert: público (vía service_role en server action). No policy regular.
-- Select/Update/Delete: solo admin (service_role).
drop policy if exists "beta_requests_admin_all" on public.beta_requests;
create policy "beta_requests_admin_all" on public.beta_requests
  for all using (
    exists (
      select 1 from public.dj_profile
      where user_id = auth.uid() and is_admin = true
    )
  );

comment on table public.beta_requests is
  'Sprint 23.5 · Solicitudes para entrar a la beta cerrada. Insertan público vía service_role, leen/editan solo admins.';

------------------------------------------------------------
-- B2 · feedback_reports
------------------------------------------------------------
-- Reportes desde el widget flotante. Solo lo ven y crean los beta users.
-- Admin tiene workflow para procesar.

create table if not exists public.feedback_reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  kind            text not null
    check (kind in ('bug', 'idea', 'copy', 'otro')),
  description     text not null,
  page_url        text not null default '',
  user_agent      text not null default '',
  screenshot_url  text not null default '',
  status          text not null default 'new'
    check (status in ('new', 'read', 'in_progress', 'resolved', 'dismissed')),
  admin_notes     text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_feedback_reports_user
  on public.feedback_reports (user_id, created_at desc);
create index if not exists idx_feedback_reports_status
  on public.feedback_reports (status, created_at desc);

drop trigger if exists trg_feedback_reports_updated_at on public.feedback_reports;
create trigger trg_feedback_reports_updated_at
  before update on public.feedback_reports
  for each row execute function public.set_updated_at();

alter table public.feedback_reports enable row level security;

-- El user puede ver/insertar sus propios reportes (uso del widget)
drop policy if exists "feedback_reports_select_own" on public.feedback_reports;
create policy "feedback_reports_select_own" on public.feedback_reports
  for select using (auth.uid() = user_id);

drop policy if exists "feedback_reports_insert_own" on public.feedback_reports;
create policy "feedback_reports_insert_own" on public.feedback_reports
  for insert with check (auth.uid() = user_id);

-- Admin puede leer/editar todo
drop policy if exists "feedback_reports_admin_all" on public.feedback_reports;
create policy "feedback_reports_admin_all" on public.feedback_reports
  for all using (
    exists (
      select 1 from public.dj_profile
      where user_id = auth.uid() and is_admin = true
    )
  );

comment on table public.feedback_reports is
  'Sprint 23.5 · Feedback enviado desde el widget flotante por beta users.';

------------------------------------------------------------
-- B3 · nps_responses
------------------------------------------------------------
-- Respuestas NPS. Una por hito (day_7, day_15) por usuario.

create table if not exists public.nps_responses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  milestone    text not null
    check (milestone in ('day_7', 'day_15')),
  score        int  not null check (score between 0 and 10),
  comment      text not null default '',
  created_at   timestamptz not null default now(),
  unique (user_id, milestone)
);

create index if not exists idx_nps_responses_milestone
  on public.nps_responses (milestone, created_at desc);

alter table public.nps_responses enable row level security;

-- El user inserta su propia respuesta
drop policy if exists "nps_responses_insert_own" on public.nps_responses;
create policy "nps_responses_insert_own" on public.nps_responses
  for insert with check (auth.uid() = user_id);

drop policy if exists "nps_responses_select_own" on public.nps_responses;
create policy "nps_responses_select_own" on public.nps_responses
  for select using (auth.uid() = user_id);

-- Admin lee todo
drop policy if exists "nps_responses_admin_select" on public.nps_responses;
create policy "nps_responses_admin_select" on public.nps_responses
  for select using (
    exists (
      select 1 from public.dj_profile
      where user_id = auth.uid() and is_admin = true
    )
  );

comment on table public.nps_responses is
  'Sprint 23.5 · NPS respuestas día 7 y día 15 de la beta.';

------------------------------------------------------------
-- B4 · usage_events
------------------------------------------------------------
-- Tracking de eventos de uso. Cero-cookie, cero-terceros. Se loguea
-- vía un endpoint /api/usage que recibe { event, metadata }, agrega
-- user_id desde la sesión, y persiste. Volumen alto: la tabla puede
-- crecer rápido, planeamos archivar > 90 días en una migration futura.

create table if not exists public.usage_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  event        text not null,
  page         text not null default '',
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists idx_usage_events_user_event
  on public.usage_events (user_id, event, created_at desc);
create index if not exists idx_usage_events_event_recent
  on public.usage_events (event, created_at desc);

alter table public.usage_events enable row level security;

-- El user inserta sus propios eventos (vía endpoint que ya valida session)
drop policy if exists "usage_events_insert_own" on public.usage_events;
create policy "usage_events_insert_own" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- Admin lee todo (para /admin/analytics)
drop policy if exists "usage_events_admin_select" on public.usage_events;
create policy "usage_events_admin_select" on public.usage_events
  for select using (
    exists (
      select 1 from public.dj_profile
      where user_id = auth.uid() and is_admin = true
    )
  );

comment on table public.usage_events is
  'Sprint 23.5 · Tracking de uso in-app. Sin cookies de terceros, sin GA.';

------------------------------------------------------------
-- B5 · dj_profile: beta_status + approved_at + request_id
------------------------------------------------------------
-- Estado de beta del DJ. 'none' = nunca tocó beta. 'active' = está en
-- los 15 días. 'expired' = pasaron los 15 días sin convertirse. 'paying' =
-- se convirtió a usuario pago (Sprint 24).

alter table public.dj_profile
  add column if not exists beta_status text not null default 'none'
    check (beta_status in ('none', 'active', 'expired', 'paying'));

alter table public.dj_profile
  add column if not exists beta_approved_at timestamptz default null;

alter table public.dj_profile
  add column if not exists beta_request_id uuid default null
    references public.beta_requests(id) on delete set null;

create index if not exists idx_dj_profile_beta_status
  on public.dj_profile (beta_status)
  where beta_status != 'none';

comment on column public.dj_profile.beta_status is
  'Sprint 23.5 · Estado del usuario en la beta cerrada (none/active/expired/paying).';
comment on column public.dj_profile.beta_approved_at is
  'Sprint 23.5 · Timestamp de cuándo se aprobó al usuario para entrar a la beta.';
comment on column public.dj_profile.beta_request_id is
  'Sprint 23.5 · FK a la solicitud de beta original (opcional, para trazabilidad).';
