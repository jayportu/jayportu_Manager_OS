-- ════════════════════════════════════════════════════════════════════
-- Migration 0028 — Sprint S19 · Suscripciones MercadoPago
-- ────────────────────────────────────────────────────────────────────
-- Sistema de suscripción $10.000 CLP/mes para DJs vía MercadoPago.
-- Soporta PAT (recurrente automático) y modo manual mes-a-mes como
-- fallback cuando la tarjeta no permite recurrencia.
--
-- Sistema PARALELO al de beta (`dj_profile.beta_status`):
--   - Los 9 DJs actuales de beta NO tienen row acá → siguen con el
--     flow beta existente (lockout post 15 días, igual que antes).
--   - Signups nuevos post-launch arrancan con una row status='trial'
--     auto-creada por la app, con trial_ends_at = now() + 15 días.
--   - Cuando pagan → status='active'.
--
-- Schema diseñado para que un user tenga 0 o 1 subscription (unique on
-- user_id). Pagos individuales viven en subscription_payments para
-- historial completo.
--
-- Ejecutar en: psql con DATABASE_URL del .env.local
-- ════════════════════════════════════════════════════════════════════

-- ─── Tabla principal: subscriptions ─────────────────────────────────
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,

  -- Estado del ciclo de vida
  status                   text not null check (status in (
                             'trial',        -- 15 días gratis, sin pagar
                             'pending',      -- esperando primer cobro confirmado
                             'active',       -- pagando OK (PAT o manual al día)
                             'past_due',     -- pago rechazado, en gracia (7 días)
                             'cancelled',    -- canceló pero sigue activo hasta current_period_end
                             'expired'       -- terminó (sin acceso)
                           )),

  -- Modo de pago: PAT recurrente vs manual mes-a-mes
  payment_mode             text not null default 'auto'
                           check (payment_mode in ('auto', 'manual')),

  -- Trial
  trial_started_at         timestamptz,
  trial_ends_at            timestamptz,

  -- Referencia MercadoPago
  mp_preapproval_id        text unique,         -- ID de la preapproval (suscripción)
  mp_payer_id              text,                -- ID del payer en MP
  card_last_4              text,                -- "4521" para mostrar al usuario
  card_brand               text,                -- "visa", "mastercard", "amex"...

  -- Período facturable actual
  current_period_start     timestamptz,
  current_period_end       timestamptz,         -- próximo cobro / fin de acceso si cancela

  -- Cancelación
  cancel_at_period_end     boolean not null default false,
  cancelled_at             timestamptz,
  cancellation_reason      text,

  -- Metadata
  amount_clp               int not null default 10000,    -- por si cambia el precio
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Cada user solo puede tener 1 subscription (la vida útil)
create unique index if not exists idx_subscriptions_user_unique
  on public.subscriptions(user_id);

-- Index para queries comunes
create index if not exists idx_subscriptions_status
  on public.subscriptions(status);

-- Index para detectar trials por expirar (cron pre-paywall)
create index if not exists idx_subscriptions_trial_ending
  on public.subscriptions(trial_ends_at)
  where status = 'trial';

-- Index para webhook lookup
create index if not exists idx_subscriptions_mp_preapproval
  on public.subscriptions(mp_preapproval_id)
  where mp_preapproval_id is not null;

-- RLS: SELECT only own. Inserts/updates solo desde server (service_role).
alter table public.subscriptions enable row level security;

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- updated_at trigger
drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ─── Tabla: subscription_payments (historial) ──────────────────────
create table if not exists public.subscription_payments (
  id                  uuid primary key default gen_random_uuid(),
  subscription_id     uuid not null references public.subscriptions(id) on delete cascade,
  user_id             uuid not null references auth.users(id) on delete cascade,

  -- MercadoPago payment
  mp_payment_id       text unique,
  amount_clp          int not null,
  status              text not null check (status in (
                        'approved',
                        'rejected',
                        'pending',
                        'refunded',
                        'cancelled'
                      )),
  payment_method      text,                  -- "visa", "master", "account_money"...

  -- Período cobrado
  period_start        timestamptz,
  period_end          timestamptz,

  -- Metadata cruda de MP por si necesitamos debuggear
  raw_metadata        jsonb default '{}'::jsonb,

  created_at          timestamptz not null default now()
);

create index if not exists idx_subscription_payments_user
  on public.subscription_payments(user_id, created_at desc);

create index if not exists idx_subscription_payments_sub
  on public.subscription_payments(subscription_id, created_at desc);

-- RLS: SELECT only own
alter table public.subscription_payments enable row level security;

drop policy if exists "subscription_payments_select_own" on public.subscription_payments;
create policy "subscription_payments_select_own" on public.subscription_payments
  for select using (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
-- ✓ Migration 0028 lista
-- ════════════════════════════════════════════════════════════════════
