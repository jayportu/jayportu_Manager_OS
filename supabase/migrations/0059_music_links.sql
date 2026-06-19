-- 0059 · Capa 2 — Catálogo musical: links a Beatport y Bandcamp
--
-- Dos URLs públicas más en el press kit del DJ, junto a soundcloud/spotify/etc.
-- No son privilegiadas: el dueño las edita (van en EDITABLE_PROFILE_FIELDS).
-- text NOT NULL DEFAULT '' para ser consistente con los otros *_url.

alter table public.dj_profile
  add column if not exists beatport_url text not null default '',
  add column if not exists bandcamp_url text not null default '';

comment on column public.dj_profile.beatport_url is
  'Capa 2 · Link al perfil/artista en Beatport (discografía). Público.';
comment on column public.dj_profile.bandcamp_url is
  'Capa 2 · Link al perfil/artista en Bandcamp. Público.';

-- Tracking: permitir los nuevos eventos click_beatport / click_bandcamp.
-- El CHECK inline de 0003 quedó auto-nombrado presskit_events_event_check.
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
    'form_submit'
  ));
