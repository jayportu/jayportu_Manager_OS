-- 0070 · Fix — restaurar los eventos de contraoferta en presskit_events
--
-- Regresión de esquema: la migración 0022 (bloque C, contraofertas) agregó
-- 'counter_submitted' y 'counter_accepted' al CHECK de presskit_events.event.
-- La migración 0059 (music links) recreó ese mismo constraint partiendo del
-- baseline 0003 + los nuevos click_beatport/click_bandcamp, pero OMITIÓ los dos
-- valores de contraoferta. Como 0059 corre después de 0022, el constraint vivo
-- los rechaza.
--
-- Efecto: cada contraoferta de un booker en /b/[token] guarda el booking OK,
-- pero el INSERT de tracking en presskit_events falla con 23514 (y el error se
-- tragaba) → las analíticas de contraoferta del DJ están subcontando desde que
-- se aplicó 0059. Este fix recrea el constraint con la lista COMPLETA (la de
-- 0059 + los dos valores de contraoferta). Idempotente.

alter table public.presskit_events
  drop constraint if exists presskit_events_event_check;
alter table public.presskit_events
  add constraint presskit_events_event_check check (event in (
    'view',
    'click_whatsapp',
    'click_email',
    'click_instagram',
    'click_soundcloud',
    'click_youtube',
    'click_spotify',
    'click_beatport',
    'click_bandcamp',
    'click_website',
    'click_tech_rider',
    'form_open',
    'form_submit',
    'counter_submitted',
    'counter_accepted'
  ));
