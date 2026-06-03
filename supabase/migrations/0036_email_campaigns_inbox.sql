-- ════════════════════════════════════════════════════════════════════
-- Migration 0036 — email_campaigns + inbox (dashboard de campañas + correo)
-- ────────────────────────────────────────────────────────────────────
-- Modelo de datos para:
--   1) Dashboard /admin/campañas: estado de entrega en vivo por campaña.
--   2) Inbox /admin/correo: correos entrantes a hola@dropgigs.com (Resend
--      Inbound), aislados por dominio (jayportu.com NO entra acá).
--
-- Todo es data de admin: RLS habilitada SIN policies públicas → solo el
-- service_role (cliente admin + webhook de Resend) puede leer/escribir.
-- El webhook upsertea por resend_id; el dashboard lee vía createAdminClient.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

-- ── 1) Campañas ──────────────────────────────────────────────────────
create table if not exists public.email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,           -- ej. 'beta-djs-2026-06'
  name             text not null,                  -- ej. 'Beta DJs — Junio 2026'
  status           text not null default 'active', -- active | draft | done
  total_recipients int  not null default 0,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ── 2) Envíos (1 fila por correo saliente; el webhook actualiza estado) ─
create table if not exists public.email_sends (
  id             uuid primary key default gen_random_uuid(),
  campaign_id    uuid references public.email_campaigns(id) on delete set null,
  resend_id      text unique,                      -- id que devuelve Resend
  to_email       text not null,
  to_name        text,
  scheduled_at   timestamptz,                      -- null = se envió al tiro
  last_event     text not null default 'queued',   -- queued|sent|delivered|bounced|complained|opened|clicked|delivery_delayed
  last_event_at  timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_email_sends_campaign
  on public.email_sends(campaign_id, created_at desc);
create index if not exists idx_email_sends_resend
  on public.email_sends(resend_id);

-- ── 3) Eventos (append-only; historial completo p/ aperturas, clicks…) ─
create table if not exists public.email_events (
  id           uuid primary key default gen_random_uuid(),
  resend_id    text not null,
  campaign_id  uuid references public.email_campaigns(id) on delete set null,
  event_type   text not null,                      -- delivered|bounced|opened|clicked|complained|…
  occurred_at  timestamptz not null default now(),
  payload      jsonb
);
create index if not exists idx_email_events_resend
  on public.email_events(resend_id, occurred_at desc);

-- ── 4) Inbox: correos entrantes a hola@dropgigs.com ────────────────────
create table if not exists public.inbound_emails (
  id                 uuid primary key default gen_random_uuid(),
  resend_id          text unique,                  -- id del inbound de Resend
  from_email         text not null,
  from_name          text,
  to_email           text not null,                -- hola@dropgigs.com (aislado por dominio)
  subject            text,
  snippet            text,                          -- preview corto p/ la lista
  text_body          text,
  html_body          text,
  thread_key         text,                          -- agrupa respuestas (Message-ID/References o asunto normalizado)
  label              text,                          -- beta | bookings | soporte | null
  folder             text not null default 'inbox', -- inbox | archived | trash
  starred            boolean not null default false,
  read_at            timestamptz,                   -- null = no leído
  matched_dj_user_id uuid references auth.users(id) on delete set null, -- si el remitente es DJ registrado
  received_at        timestamptz not null default now()
);
create index if not exists idx_inbound_emails_folder
  on public.inbound_emails(folder, received_at desc);
create index if not exists idx_inbound_emails_thread
  on public.inbound_emails(thread_key);

-- ── RLS: data de admin. Habilitada sin policies → solo service_role. ────
alter table public.email_campaigns enable row level security;
alter table public.email_sends     enable row level security;
alter table public.email_events    enable row level security;
alter table public.inbound_emails  enable row level security;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0036 lista
-- ════════════════════════════════════════════════════════════════════
