# Feature — Redes: conectar Instagram (Business Discovery) + Spotify

> Nueva funcionalidad (NO re-skin). Suma 2 plataformas con sync de stats al tab `/redes`, espejando SoundCloud/YouTube.

**Alcance:** Instagram (Business Discovery, followers + #posts) y Spotify (client-credentials, followers + popularity). TikTok y Bandcamp fuera. Env-gated (dormido si faltan credenciales) — el tab no se rompe. 1 PR.

## Decisiones (aprobadas por el usuario)
1. Popularity de Spotify se guarda en `last_track_count` (label "Popularidad" en el bloque). Sin columnas nuevas.
2. Instagram valida contra la API **al conectar**: si la cuenta no es Business/Creator+pública → mensaje "no cumple condiciones", no guarda.
3. UI: duplicar bloques (no refactor de SC/YT), para no arriesgar el feature que ya anda.

## Constraints
- NO tocar el flujo de auth/guards existente. `getCachedUser`/`getUserOrThrow`/RLS intactos.
- Env leído con `process.env.X` directo + helper `isXConfigured()` (estilo `isResendConfigured`/`turnstile`). Sin romper si faltan.
- Gate: `tsc --noEmit && lint && build`. Migración se aplica en deploy (no la aplico yo a prod).

## Task A — datos + integraciones (implementer 1)
- **`src/types/database.ts`**: agregar `"spotify"` a `SOCIAL_PLATFORMS` + su entrada en `SOCIAL_PLATFORM_LABELS` ("Spotify"). (instagram ya está.)
- **`supabase/migrations/0080_add_spotify_platform.sql`**: ensanchar el CHECK de `platform` en `platform_accounts` Y en `platform_snapshots` para incluir `'spotify'` (drop+recreate constraint; NO es enum). (instagram ya está en ambos; tiktok/twitter/facebook/mixcloud/otro se conservan.)
- **`src/lib/integrations/spotify.ts`**:
  - `isSpotifyConfigured(): boolean` (`!!SPOTIFY_CLIENT_ID && !!SPOTIFY_CLIENT_SECRET`).
  - `parseSpotifyArtistId(input): string | null` — de `open.spotify.com/artist/{id}`, `spotify:artist:{id}` o id pelado; `null` si es user/playlist/album/otro.
  - `interface SpotifyArtist { external_id; name; followers; popularity; genres; url; image_url }`.
  - `fetchSpotifyArtist(idOrUrl): Promise<SpotifyArtist>` — client-credentials POST `accounts.spotify.com/api/token` → `GET api.spotify.com/v1/artists/{id}` (`cache:"no-store"`, timeout 15s). Throw si `!isSpotifyConfigured()`, si el id es inválido, o 404.
- **`src/lib/integrations/instagram.ts`**:
  - `isMetaConfigured(): boolean` (`!!META_GRAPH_TOKEN && !!IG_BUSINESS_ACCOUNT_ID`).
  - `normalizeInstagramHandle(input): string` — quita `@`, URL `instagram.com/{handle}` → handle.
  - `interface InstagramProfile { username; followers_count; media_count; external_id: string|null; name?; profile_picture_url?: string|null }`.
  - `class InstagramNotEligibleError extends Error` — para distinguir "no es cuenta profesional/pública".
  - `fetchInstagramBusinessProfile(handle): Promise<InstagramProfile>` — Business Discovery: `GET graph.facebook.com/v21.0/{IG_BUSINESS_ACCOUNT_ID}?fields=business_discovery.username({handle}){followers_count,media_count,username,name,profile_picture_url,id}&access_token={META_GRAPH_TOKEN}`. Throw `InstagramNotEligibleError` cuando el error de la API indique cuenta no-profesional/privada/inexistente; `Error` genérico en otros; throw si `!isMetaConfigured()`.
- **`.env.example`**: bloques comentados nuevos → `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` y `META_GRAPH_TOKEN`/`IG_BUSINESS_ACCOUNT_ID` (con nota de que IG requiere App Review de Meta).

## Task B — wiring + UI (implementer 2, depende de A)
- **`src/app/(app)/redes/platform-accounts-actions.ts`**:
  - `saveSpotifyAccountAction({ url })`: si `!isSpotifyConfigured()` → error "no disponible todavía"; `parseSpotifyArtistId` (si null → "pegá el link de tu perfil de ARTISTA"); `fetchSpotifyArtist` (catch → "no encontramos ese artista"); `upsertPlatformAccount({platform:"spotify", username: artist.name})`; luego `updateAccountSyncResult(id, { followers: artist.followers, track_count: artist.popularity, external_id: artist.external_id, error:null })`. revalidate `/redes`+`/growth`.
  - `saveInstagramAccountAction({ username })`: si `!isMetaConfigured()` → "no disponible todavía"; `normalizeInstagramHandle`; `fetchInstagramBusinessProfile` (catch `InstagramNotEligibleError` → **"Esta cuenta no cumple las condiciones para enlazar: tiene que ser Business o Creator y pública en Instagram."**; catch otro → "no pudimos verificar la cuenta"); `upsertPlatformAccount({platform:"instagram", username: handle})`; `updateAccountSyncResult(id, { followers: p.followers_count, track_count: p.media_count, external_id: p.external_id, error:null })`. revalidate.
- **`src/lib/integrations/sync-job.ts`**: 2 `else if` nuevos en `syncOneAccount`:
  - `instagram`: `fetchInstagramBusinessProfile(acc.username)` → followers=followers_count, trackOrVideoCount=media_count, externalId.
  - `spotify`: `fetchSpotifyArtist(acc.external_id || acc.username)` → followers=followers, trackOrVideoCount=popularity, externalId. (snapshot total_posts = popularity, reuso documentado.)
- **`src/app/(app)/redes/platform-accounts-section.tsx`**: 2 bloques nuevos (copiar patrón SC/YT):
  - **Instagram**: label "Followers"/"Posts"; **disclaimer visible**: "Tu cuenta debe ser Business o Creator y pública."; el error de la action se muestra en el `<Alert>` compartido.
  - **Spotify**: input = URL de artista; labels "Followers"/"Popularidad"; subtítulo "Followers + popularity (Spotify Web API)".

## Self-Review
- Fuera de alcance: TikTok, Bandcamp, auth/guards, snapshots-schema salvo el CHECK.
- Riesgo: bajo-medio (feature aditivo, env-gated). IG no-funcional en prod hasta App Review (esperado). Migración Spotify debe aplicarse en deploy antes de que alguien conecte Spotify.
