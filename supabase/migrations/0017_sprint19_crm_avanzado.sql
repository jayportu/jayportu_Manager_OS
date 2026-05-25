-- 0017 · Sprint 19 — CRM avanzado
--
-- Cuatro bloques de cambios sobre tablas existentes (todo aditivo, sin
-- crear tablas nuevas):
--   E1 · calendar_events:  monto $, estado pago, documento
--   E2 · contacts:         tags[] + private_notes
--   E3 · contacts:         (private_notes ya viene de E2 — mismo campo)
--   E4 · follow_ups:       campos de recurrencia (cada N días/semanas/meses)
--
-- Diseño de recurrencia:
--   · Una serie se identifica con recurrence_series_id (UUID compartido).
--   · El primer follow-up de la serie tiene recurrence_series_id = su propio id.
--   · Al cerrar uno con is_recurring=true, la server action crea el siguiente
--     con el mismo recurrence_series_id + recurrence_index += 1 + due_at calculado.
--   · Si recurrence_max IS NOT NULL y recurrence_index >= recurrence_max → no crea más.

------------------------------------------------------------
-- E1 · calendar_events: tracking financiero
------------------------------------------------------------

alter table public.calendar_events
  add column if not exists amount_clp numeric(12, 0) default null;

-- Estado del cobro: paid (cobrado) · pending (debe) · partial (anticipo) · none (canje/favor)
alter table public.calendar_events
  add column if not exists payment_status text not null default 'none'
  check (payment_status in ('paid', 'pending', 'partial', 'none'));

-- Documento emitido: boleta de honorarios, factura, o ninguno
alter table public.calendar_events
  add column if not exists document_type text not null default 'none'
  check (document_type in ('boleta', 'factura', 'none'));

-- Cuándo fue pagado (null si aún no se cobra). Útil para reports y filtros.
alter table public.calendar_events
  add column if not exists paid_at timestamptz default null;

comment on column public.calendar_events.amount_clp is
  'Monto cobrado por el gig en CLP (sin decimales). NULL si no aplica.';
comment on column public.calendar_events.payment_status is
  'paid | pending | partial | none. Default none (canje/favor o evento no facturable).';
comment on column public.calendar_events.document_type is
  'boleta | factura | none. Para export al contador.';
comment on column public.calendar_events.paid_at is
  'Cuándo se cobró. NULL = pendiente o no aplica.';

-- Índice para queries de pagos pendientes (cron de aviso +30d)
create index if not exists idx_calendar_events_payment_pending
  on public.calendar_events (user_id, payment_status, start_at)
  where payment_status = 'pending';

------------------------------------------------------------
-- E2 + E3 · contacts: tags + private_notes
------------------------------------------------------------

-- Tags arbitrarios sin límite. Forma: ["booker-stgo-centro", "tech-house-friendly"].
-- Lowercase + sin espacios (la app valida antes de insert).
alter table public.contacts
  add column if not exists tags text[] not null default array[]::text[];

-- Notas privadas — SOLO visibles al owner. Nunca aparecen en press kit,
-- export CSV, plantillas de mail, etc. (El `notes` existente sigue siendo
-- "notas generales" del contacto, que sí pueden aparecer en views internas.)
alter table public.contacts
  add column if not exists private_notes text not null default '';

comment on column public.contacts.tags is
  'Tags arbitrarios (lowercase, sin espacios) para segmentación. Ej: booker-stgo-centro.';
comment on column public.contacts.private_notes is
  'Notas privadas del DJ. Nunca exportadas, nunca compartidas. RLS estricto = solo owner.';

-- Índice GIN para queries por tag (filtros AND en /crm)
create index if not exists idx_contacts_tags_gin
  on public.contacts using gin (tags);

------------------------------------------------------------
-- E4 · follow_ups: recurrencia
------------------------------------------------------------

alter table public.follow_ups
  add column if not exists is_recurring boolean not null default false;

-- Frecuencia: cada `recurrence_value` `recurrence_unit`.
-- Ej: 30 + 'days' = cada 30 días. 1 + 'months' = cada mes.
alter table public.follow_ups
  add column if not exists recurrence_value int default null
  check (recurrence_value is null or recurrence_value > 0);

alter table public.follow_ups
  add column if not exists recurrence_unit text default null
  check (recurrence_unit is null or recurrence_unit in ('days', 'weeks', 'months'));

-- UUID compartido por toda la serie (todos los follow-ups generados desde
-- el mismo recurrente comparten este id). El primero tiene su propio id aquí.
alter table public.follow_ups
  add column if not exists recurrence_series_id uuid default null;

-- Número de ciclo dentro de la serie. El primero = 1.
alter table public.follow_ups
  add column if not exists recurrence_index int not null default 1
  check (recurrence_index > 0);

-- Tope opcional: parar de crear nuevos al llegar a N. NULL = infinito.
alter table public.follow_ups
  add column if not exists recurrence_max int default null
  check (recurrence_max is null or recurrence_max > 0);

comment on column public.follow_ups.is_recurring is
  'true = al cerrar este follow-up, server action crea el siguiente.';
comment on column public.follow_ups.recurrence_value is
  'Cantidad de unidades entre ciclos. Ej: 30 con unit=days = cada 30 días.';
comment on column public.follow_ups.recurrence_unit is
  'days | weeks | months. Sumado a due_at al cerrar para calcular el próximo.';
comment on column public.follow_ups.recurrence_series_id is
  'UUID compartido por toda la serie. El primero apunta a su propio id.';
comment on column public.follow_ups.recurrence_index is
  '1, 2, 3... número del ciclo dentro de la serie.';
comment on column public.follow_ups.recurrence_max is
  'Tope opcional de ciclos. NULL = infinito.';

create index if not exists idx_follow_ups_recurring
  on public.follow_ups (user_id, is_recurring, due_at)
  where is_recurring = true;

create index if not exists idx_follow_ups_series
  on public.follow_ups (recurrence_series_id)
  where recurrence_series_id is not null;
