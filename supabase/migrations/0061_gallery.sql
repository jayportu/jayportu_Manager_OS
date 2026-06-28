-- 0061 · Galería del press kit — fotos con carpetas
--
-- Feature post-dark (inspirada en MavelPoint): el DJ arma una galería de fotos
-- organizadas en carpetas. Las imágenes viven en Storage (bucket `avatars`,
-- path `<user>/gallery/...` — mismo bucket público que el avatar, sin crear uno
-- nuevo); esta columna guarda solo URL + metadata como un array jsonb de
-- objetos { url, folder, caption }.
--
-- Reusa toda la infra de dj_profile: RLS (el dueño edita; el press kit público
-- lo lee vía service_role en getProfileBySlug) y la allowlist
-- EDITABLE_PROFILE_FIELDS (se agrega "gallery"). Mismo patrón que featured_sets
-- / beatport_releases, pero jsonb en vez de text[] porque lleva metadata.

alter table public.dj_profile
  add column if not exists gallery jsonb not null default '[]'::jsonb;

comment on column public.dj_profile.gallery is
  'Galería del press kit: array jsonb de {url, folder, caption}. URLs de Storage (bucket avatars, path <user>/gallery/). Público (se muestra en /p/[slug]).';
