-- 0018 · Sprint 20 — Marketplace inicial
--
-- Tres bloques de cambios:
--   B1+B2 · dj_profile: disponibilidad + flag para ocultar del directorio
--   B3    · booking_form_submissions: workflow extendido (cotizado + agendado)
--           con links a follow_up y calendar_event auto-generados
--   B4    · contacts (venues): capacity_estimate + accepted_genres[]

------------------------------------------------------------
-- B1 + B2 · dj_profile: disponibilidad
------------------------------------------------------------

-- Toggle "ocultar mi perfil del directorio público /dj".
-- Default = false (todos aparecen — opt-out, no opt-in).
alter table public.dj_profile
  add column if not exists hidden_from_directory boolean not null default false;

-- "Disponible para tocar" con rango de fechas.
-- Si ambos NULL = no marca disponibilidad (default).
-- Si available_from <= today <= available_until → aparece con badge "★ disponible".
alter table public.dj_profile
  add column if not exists available_from date default null;

alter table public.dj_profile
  add column if not exists available_until date default null;

-- Nota opcional dirigida a bookers cuando el DJ está disponible.
-- Ej: "Busco shows en Stgo viernes-domingo. EP launches y residencias."
alter table public.dj_profile
  add column if not exists available_note text not null default '';

comment on column public.dj_profile.hidden_from_directory is
  'Si true, el perfil NO aparece en /dj (directorio público). Default false.';
comment on column public.dj_profile.available_from is
  'Fecha desde la que el DJ está disponible. NULL = no marca disponibilidad.';
comment on column public.dj_profile.available_until is
  'Fecha hasta la que el DJ está disponible.';
comment on column public.dj_profile.available_note is
  'Nota opcional para bookers (qué busca, días preferidos, etc).';

-- Índice para query principal del directorio: profiles NO ocultos con slug.
create index if not exists idx_dj_profile_directory
  on public.dj_profile (public_slug, artist_name)
  where hidden_from_directory = false and public_slug is not null;

-- Índice para query "solo disponibles" (filtro en /dj).
create index if not exists idx_dj_profile_available
  on public.dj_profile (available_from, available_until)
  where hidden_from_directory = false
    and available_from is not null;

------------------------------------------------------------
-- B3 · booking_form_submissions: workflow extendido
------------------------------------------------------------

-- 1. PRIMERO drop el check viejo para poder hacer rename de valores.
alter table public.booking_form_submissions
  drop constraint if exists booking_form_submissions_status_check;

-- 2. Rename de valores antiguos a la nueva nomenclatura:
--    'pendiente'  → 'nuevo'
--    'convertido' → 'agendado'
--    'descartado' → 'rechazado'
--    'leido' y 'respondido' se mantienen.
update public.booking_form_submissions
set status = 'nuevo'
where status = 'pendiente';

update public.booking_form_submissions
set status = 'agendado'
where status = 'convertido';

update public.booking_form_submissions
set status = 'rechazado'
where status = 'descartado';

-- 3. Agregar check nuevo con la lista actualizada (incluye 'cotizado').
alter table public.booking_form_submissions
  add constraint booking_form_submissions_status_check
  check (status in (
    'nuevo', 'leido', 'respondido', 'cotizado', 'agendado', 'rechazado'
  ));

-- 3. Cambiar el default.
alter table public.booking_form_submissions
  alter column status set default 'nuevo';

-- 4. Agregar columnas para workflow + auto-actions.
alter table public.booking_form_submissions
  add column if not exists quoted_amount_clp numeric(12, 0) default null;

alter table public.booking_form_submissions
  add column if not exists notes_internal text not null default '';

-- Link al follow_up auto-generado al pasar a "cotizado".
alter table public.booking_form_submissions
  add column if not exists follow_up_id uuid default null;

-- Link al calendar_event auto-generado al pasar a "agendado".
alter table public.booking_form_submissions
  add column if not exists calendar_event_id uuid default null;

-- Timestamps de cambio de estado (útil para KPIs de tiempo de respuesta).
alter table public.booking_form_submissions
  add column if not exists quoted_at timestamptz default null;

alter table public.booking_form_submissions
  add column if not exists agendado_at timestamptz default null;

-- FKs (separadas para que el ALTER no falle si las tablas no existen aún).
-- ON DELETE SET NULL: si se borra el follow-up o el evento, mantenemos
-- el booking pero rompemos el link.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'follow_ups') then
    if not exists (
      select 1 from information_schema.table_constraints
      where constraint_name = 'booking_form_submissions_follow_up_fk'
    ) then
      alter table public.booking_form_submissions
        add constraint booking_form_submissions_follow_up_fk
        foreign key (follow_up_id) references public.follow_ups(id)
        on delete set null;
    end if;
  end if;

  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'calendar_events') then
    if not exists (
      select 1 from information_schema.table_constraints
      where constraint_name = 'booking_form_submissions_event_fk'
    ) then
      alter table public.booking_form_submissions
        add constraint booking_form_submissions_event_fk
        foreign key (calendar_event_id) references public.calendar_events(id)
        on delete set null;
    end if;
  end if;
end $$;

comment on column public.booking_form_submissions.quoted_amount_clp is
  'Monto cotizado al venue/booker (CLP). Se setea al pasar a "cotizado".';
comment on column public.booking_form_submissions.notes_internal is
  'Notas internas del DJ sobre este booking. No se exportan ni se mandan al booker.';
comment on column public.booking_form_submissions.follow_up_id is
  'Sprint 20: follow_up auto-generado al pasar a "cotizado" (recontactar +3 días).';
comment on column public.booking_form_submissions.calendar_event_id is
  'Sprint 20: calendar_event auto-generado al pasar a "agendado".';

------------------------------------------------------------
-- B4 · contacts: capacity + accepted_genres (solo aplica a venues)
------------------------------------------------------------

-- Capacidad estimada del venue (NULL si no es venue o no se sabe).
alter table public.contacts
  add column if not exists capacity_estimate int default null
  check (capacity_estimate is null or capacity_estimate > 0);

-- Géneros que el venue acepta (auto-poblable con IA en futuro, manual por ahora).
-- Ej: ['techno','house','deep-house']. Lowercase + dashes (como tags Sprint 19).
alter table public.contacts
  add column if not exists accepted_genres text[] not null default array[]::text[];

comment on column public.contacts.capacity_estimate is
  'Capacidad aproximada del venue (personas). NULL si no se conoce o no aplica.';
comment on column public.contacts.accepted_genres is
  'Géneros que el venue acepta. Para filtros en /descubrir. Lowercase + dashes.';

-- Índice para queries por capacidad (filtros tipo "300+").
-- Solo aplica a tipos venue (no contactos individuales).
create index if not exists idx_contacts_capacity
  on public.contacts (capacity_estimate)
  where capacity_estimate is not null
    and type in ('club', 'bar', 'rooftop', 'festival', 'productora');

-- Índice GIN para queries por género aceptado.
create index if not exists idx_contacts_accepted_genres
  on public.contacts using gin (accepted_genres);
