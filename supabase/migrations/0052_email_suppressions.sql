-- ════════════════════════════════════════════════════════════════════
-- Migration 0052 — email_suppressions (Lista de bajas única)
-- ────────────────────────────────────────────────────────────────────
-- Un solo lugar con TODOS los correos a los que NO hay que volver a
-- escribir: rebotes, quejas de spam, bajas (one-click del header
-- List-Unsubscribe o link del footer) y respuestas "bajar" al inbox.
--
-- Se llena sola desde:
--   - el webhook de Resend (bounced/complained → reason bounced/complained;
--     inbound con "bajar"/"unsubscribe" → reason unsubscribe)
--   - /api/unsubscribe?email=... (one-click + link del footer)
--   - alta/baja manual desde /admin/bajas
-- Y los scripts de campaña la consultan SIEMPRE antes de enviar.
--
-- Ejecutar: node scripts/run_migration.mjs supabase/migrations/0052_email_suppressions.sql
-- ════════════════════════════════════════════════════════════════════

create table if not exists public.email_suppressions (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  reason        text not null default 'unsubscribe'
    check (reason in ('unsubscribe', 'bounced', 'complained', 'manual')),
  source        text,            -- list-unsubscribe | reply-bajar | webhook | admin | seed
  note          text,
  created_at    timestamptz not null default now()
);

-- Un correo aparece una sola vez (case-insensitive). El upsert lo respeta.
create unique index if not exists idx_email_suppressions_email
  on public.email_suppressions (lower(email));

alter table public.email_suppressions enable row level security;

-- Solo admin lee/edita (defensa en profundidad; las escrituras públicas
-- entran vía service_role desde el webhook / /api/unsubscribe, que saltan RLS).
drop policy if exists "email_suppressions_admin_all" on public.email_suppressions;
create policy "email_suppressions_admin_all" on public.email_suppressions
  for all using (
    exists (
      select 1 from public.dj_profile
      where user_id = auth.uid() and is_admin = true
    )
  );

-- ─── Siembra: rebotes + quejas que ya existen (campañas previas) ─────
-- Así la ola 1 (≈53 rebotes) queda fuera para siempre desde el día uno.
insert into public.email_suppressions (email, reason, source, created_at)
select distinct on (lower(es.to_email))
  lower(es.to_email),
  case when es.last_event = 'complained' then 'complained' else 'bounced' end,
  'seed',
  now()
from public.email_sends es
where es.last_event in ('bounced', 'complained')
  and es.to_email is not null
  and length(trim(es.to_email)) > 0
order by lower(es.to_email)
on conflict (lower(email)) do nothing;

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0052 lista
-- ════════════════════════════════════════════════════════════════════
