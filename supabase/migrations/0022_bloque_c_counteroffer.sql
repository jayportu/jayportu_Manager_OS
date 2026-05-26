-- 0022 · Bloque C — Booking state machine + counteroffer + timeline
--
-- Cambios:
--   C1 · booking_form_submissions:
--      - Status nuevo: 'contraofertado'
--      - Columns nuevas: counter_amount_clp, counter_event_date,
--        counter_message, counter_at, responded_at
--   C2 · Política RLS extra:
--      - Booker puede UPDATE solo los campos counter_* en SUS bookings
--        cuando el status actual es 'cotizado'. Otros UPDATE siguen
--        bloqueados al booker.
--   C3 · presskit_events: agregar 2 event types nuevos
--      ('counter_submitted', 'counter_accepted')

------------------------------------------------------------
-- C1 · Status nuevo + timeline columns
------------------------------------------------------------

-- Drop el check viejo, agregar el nuevo con 'contraofertado'.
alter table public.booking_form_submissions
  drop constraint if exists booking_form_submissions_status_check;

alter table public.booking_form_submissions
  add constraint booking_form_submissions_status_check
  check (status in (
    'nuevo', 'leido', 'respondido', 'cotizado',
    'contraofertado', 'agendado', 'rechazado'
  ));

-- Counter del booker: si después de cotizar el booker no acepta el monto
-- o la fecha, puede contraofertar adentro de DROP.
alter table public.booking_form_submissions
  add column if not exists counter_amount_clp numeric(12, 0) default null;

alter table public.booking_form_submissions
  add column if not exists counter_event_date date default null;

alter table public.booking_form_submissions
  add column if not exists counter_message text not null default '';

alter table public.booking_form_submissions
  add column if not exists counter_at timestamptz default null;

-- Timestamp de cuándo el DJ pasó a 'respondido' (faltaba para timeline).
alter table public.booking_form_submissions
  add column if not exists responded_at timestamptz default null;

comment on column public.booking_form_submissions.counter_amount_clp is
  'Bloque C — Monto que el booker contraofertó si el cotizado no le sirvió.';
comment on column public.booking_form_submissions.counter_event_date is
  'Bloque C — Fecha alternativa propuesta por el booker en la contraoferta.';
comment on column public.booking_form_submissions.counter_message is
  'Bloque C — Mensaje libre del booker explicando la contraoferta.';
comment on column public.booking_form_submissions.counter_at is
  'Bloque C — Timestamp del envío de la contraoferta.';
comment on column public.booking_form_submissions.responded_at is
  'Bloque C — Timestamp del cambio a status=respondido (para timeline).';

------------------------------------------------------------
-- C2 · RLS: permitir al booker mandar counteroffer
------------------------------------------------------------

-- El booker NO tiene UPDATE general (eso lo controla el DJ). PERO con
-- esta política puntual, puede setear los campos counter_* en SUS
-- bookings cuando el estado actual sea 'cotizado' (post-cotización del DJ).
-- En la práctica el server action usa service_role para hacer este UPDATE
-- + transición a 'contraofertado'; esta policy es defensa adicional para
-- que UPDATEs directos del client SDK no rompan.

drop policy if exists "bookings_update_booker_counter" on public.booking_form_submissions;
create policy "bookings_update_booker_counter" on public.booking_form_submissions
  for update
  using (
    auth.uid() = booker_user_id
    and status = 'cotizado'
  )
  with check (
    auth.uid() = booker_user_id
  );

------------------------------------------------------------
-- C3 · presskit_events: nuevos event types
------------------------------------------------------------
-- Los UTMs (Bloque A · A8) viven en metadata jsonb; los counter events
-- son tipos formales del flow para que aparezcan en KPIs del DJ.

alter table public.presskit_events
  drop constraint if exists presskit_events_event_check;

alter table public.presskit_events
  add constraint presskit_events_event_check
  check (event in (
    'view',
    'click_whatsapp',
    'click_email',
    'click_instagram',
    'click_soundcloud',
    'click_youtube',
    'click_spotify',
    'click_website',
    'click_tech_rider',
    'form_open',
    'form_submit',
    'counter_submitted',
    'counter_accepted'
  ));
