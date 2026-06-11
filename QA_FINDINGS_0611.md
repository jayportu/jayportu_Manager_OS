# QA tab por tab · DROP — 2026-06-11

> Barrido multi-agente (12 zonas, 63 agentes) + verificación adversarial de cada hallazgo alto/medio + runtime de flujos públicos. Los falsos positivos ya fueron descartados por el verificador y se listan al final.

**3 altos · 25 medios · 72 bajos** (reales, sin contar 6 falsos positivos descartados; 3 marcados inciertos).

---

## Auth & onboarding (login, signup booker, forgot/reset password, welcome, beta, cuenta-suspendida, middleware, Turnstile, invites beta/founding)

_La zona está mayormente sana y bien pensada (errores de Supabase chequeados, copy en tuteo chileno consistente, open-redirect sanitizado en /login, honeypot + rate-limit en /beta, fallback por email en consumo de invites). Encontré 1 hallazgo alto (CAPTCHA de login/signup/reset solo es efectivo si Supabase tiene Bot Protection activo con el mismo secret — hoy es config-dependiente y puede ser decorativo) y varios medios/bajos: open-redirect no sanitizado en /auth/callback (mitigado por prefijo origin), reset-password acepta cualquier sesión y no solo recovery, consumeBetaInviteIfAny corre 1-2 queries admin en CADA navegación de la app, redirect de middleware para usuario logueado no cubre /signup/booker, y CAPTCHA del server (verifyTurnstile) falla-abierto ante error de red._

### 🟠 [MEDIO] /auth/callback no sanitiza el param `next` (open-redirect mitigado solo por prefijo origin) · _confirmado_
- **Dónde:** `src/app/auth/callback/route.ts:25,105`  · tipo: bug
- **Qué:** El callback lee `const next = searchParams.get('next') ?? '/'` (línea 25) y al final hace `NextResponse.redirect(`${origin}${next}`)` (línea 105) sin validar que `next` empiece con '/' ni que no sea '//'. En /login/page.tsx:64-69 sí se sanitiza next (debe empezar con '/' y no con '//'), pero el callback NO replica esa defensa. El prefijo `${origin}` evita el caso `next=https://evil.com` (queda `https://dropgigs.com/https://evil.com`, un path), pero un atacante puede pasar rutas internas arbitrarias para confundir (`next=/admin`, `next=/algo-falso`). El riesgo de open-redirect externo está mitigado por el prefijo origin, pero la inconsistencia con la sanitización de /login es un foco de bug a futuro si alguien cambia el patrón a `redirect(next)`.
- **Impacto:** Hoy no permite redirect externo (origin lo neutraliza), pero un atacante puede mandar links de confirmación con `next` apuntando a rutas internas inesperadas, y cualquier refactor que quite el prefijo origin abriría un open-redirect real. Inconsistencia de defensa entre /login (sanitiza) y /callback (no).
- **Fix:** Aplicar la misma sanitización de /login/page.tsx en el callback: `const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/';` y redirigir a `${origin}${safeNext}`.
- **Verificación:** El código dice exactamente lo afirmado: src/app/auth/callback/route.ts:25 lee `const next = searchParams.get("next") ?? "/"` crudo, y la línea 105 hace `return NextResponse.redirect(`${origin}${next}`)` sin validar. src/app/login/page.tsx:64-69 SÍ sanitiza (`startsWith("/") && !startsWith("//")`). La inconsistencia de defensa es real, y `/auth` está en PUBLIC_PATHS (middleware.ts:11), así que el e…

### ⚪ [BAJO] consumeBetaInviteIfAny corre 1-2 queries admin en CADA request a la app · _confirmado_
- **Dónde:** `src/app/(app)/layout.tsx:39-42; src/lib/queries/beta-invite.ts:64-141`  · tipo: friccion
- **Qué:** (app)/layout.tsx llama `await consumeBetaInviteIfAny(...)` en cada render del layout protegido, es decir en cada navegación a cualquier ruta de /dashboard, /crm, /growth, etc. Para un DJ ya activado y sin cookie de invite, el flujo siempre cae al fallback por email (beta-invite.ts:110-117): un query a beta_requests por email+status+user_id IS NULL en cada page load. A diferencia de /booker/layout.tsx que usa un guard in-memory `backfilledUsers` (línea 15,54) para no re-correr el consumo, el layout de DJ NO tiene ese guard y repite el trabajo siempre.
- **Impacto:** Latencia y carga extra en cada navegación de DJ: un round-trip al admin client (service_role) que casi siempre devuelve vacío. Multiplicado por toda la app y todos los DJs, es egress/queries innecesarios (relevante dado el contexto Supabase PRO + control de egress). No rompe funcionalidad pero es fricción de performance evitable.
- **Fix:** Replicar el patrón de /booker/layout: guard in-memory `Set<userId>` por instancia para correr consumeBetaInviteIfAny solo la primera vez por sesión/instancia (es idempotente). O early-return si el dj_profile ya tiene beta_status !== null antes de tocar beta_requests.
- **Verificación:** El código en las ubicaciones citadas dice lo que afirma el hallazgo. (a) src/app/(app)/layout.tsx:39-42 llama `await consumeBetaInviteIfAny(...)` SIN condición en cada render del layout protegido (DJ), antes de leer el profile. (b) Para un DJ sin cookie, el flujo cae al fallback por email en src/lib/queries/beta-invite.ts:110-117: un query admin (service_role) a beta_requests por email+status+user…

### ⚪ [BAJO] Middleware no redirige a usuario logueado que visita /signup/booker (solo cubre /signup exacto)
- **Dónde:** `src/lib/supabase/middleware.ts:132-136`  · tipo: bug
- **Qué:** El redirect post-login para usuarios ya autenticados solo dispara con `pathname === '/login' || pathname === '/signup'` (línea 132), comparación exacta. La ruta real de signup de booker es /signup/booker, que no matchea `=== '/signup'`. Un booker (o DJ) ya logueado que abre /signup/booker no es redirigido a '/'; ve el formulario de crear cuenta de booker estando ya logueado.
- **Impacto:** Un usuario logueado puede aterrizar en el form de signup booker y, al enviarlo, Supabase responde 'already registered' (lo maneja el form, booker-signup-form.tsx:130-135) o crea confusión. Cosmético/edge — no rompe datos, solo UX rara para alguien ya autenticado.
- **Fix:** Cambiar la condición a algo como `pathname === '/login' || pathname.startsWith('/signup')` para que /signup/booker también redirija a '/' (RootPage decide destino por tipo).

### ⚪ [BAJO] verifyTurnstile falla-abierto ante error de red (única validación server-side de CAPTCHA)
- **Dónde:** `src/lib/turnstile.ts:40-43`  · tipo: friccion
- **Qué:** verifyTurnstile, el único punto donde el server valida el CAPTCHA (lo usa /api/beta), ante una excepción de fetch contra Cloudflare retorna `{ ok: true, skipped: true }` (líneas 40-43): fail-open. El comentario lo justifica ('ante un fallo de red no bloqueamos al usuario legítimo'). Combinado con que el secret puede no estar configurado (también skipped), la verificación de bots del endpoint /beta es best-effort.
- **Impacto:** Un atacante que logre inducir/aprovechar fallos de red hacia challenges.cloudflare.com (o un outage de CF) puede pasar el gate del form /beta sin resolver CAPTCHA. El rate-limit (3/15min por IP) y el honeypot siguen activos, así que el impacto es acotado, pero el CAPTCHA deja de ser una barrera dura justo cuando más se necesita.
- **Fix:** Considerar fail-closed (devolver ok:false) cuando el secret SÍ está configurado pero el fetch falla, o al menos loguear/alertar el caso skipped-by-error para detectar abuso. Mantener fail-open solo para el caso 'sin secret' (dormido).

### ⚪ [BAJO] consumeBetaInviteIfAny puede crear un dj_profile fantasma para un booker
- **Dónde:** `src/lib/queries/beta-invite.ts:180-190; src/app/(app)/layout.tsx:39`  · tipo: bug
- **Qué:** consumeBetaInviteIfAny hace `admin.from('dj_profile').upsert({ user_id, beta_status:'active', ... }, { onConflict:'user_id' })` (beta-invite.ts:180-190). El trigger handle_new_user (migration 0033) NO crea dj_profile para cuentas con account_type='booker'. Pero el (app)/layout corre consumeBetaInviteIfAny para CUALQUIER usuario autenticado que entre a (app). Si un booker (sin dj_profile) tuviera un beta_request aprobado con su email y user_id NULL (edge: mismo email usado para solicitar beta de DJ antes), el upsert le crea un dj_profile, y luego /booker/layout.tsx:38-43 lo detecta como DJ y lo redirige a /dashboard, dejando el portal booker inalcanzable — exactamente el bug que 0033 intentó cerrar.
- **Impacto:** Edge raro (requiere que la misma persona haya pedido beta de DJ y luego se registre como booker con el mismo email), pero si ocurre deja al booker atrapado fuera de su portal, con un dj_profile parcial creado por service_role. Difícil de diagnosticar.
- **Fix:** Antes del upsert, verificar que el usuario no sea booker (p.ej. chequear account_type en user_metadata, o no correr consumeBetaInviteIfAny si el user llegó vía booker). Idealmente el consumo de invite de DJ debería gatillarse solo en rutas de DJ, no en un layout compartido que también ven bookers transitando.

---

## Landing & directorio público (/, /dj, /p/[slug], components/public, queries/directory, queries/presskit, lib/format)

_La zona está mayormente sana y bien pensada (account_status filtrado en TODAS las superficies — /dj, /p/[slug], feed de eventos; lectura base cacheada; secciones que se ocultan si vacías; XSS de JSON-LD mitigado; next/image con guard isSupabaseStorageUrl). Pero hay un bug funcional real de cap silencioso en el conteo/grilla de /dj que rompe justo cuando la campaña (~861 DJs) supere los 200, y un bug de timezone en el cálculo de "disponible hoy" que usa fecha UTC en vez de Chile. El resto son fricciones medias/bajas de SEO (press kit sin OG image ni canonical) y robustez (caps de 1000 filas sin paginar, conteo de colecciones potencialmente cortado a 200)._

### 🔴 [ALTO] El directorio /dj cuenta y muestra como máximo 200 DJs (cap silencioso) · _confirmado_
- **Dónde:** `src/app/dj/page.tsx:69-78, 134, 332 + src/lib/queries/directory.ts:218`  · tipo: bug
- **Qué:** En /dj se llama `listPublicDjs({...})` SIN pasar `limit`, y `listPublicDjs` termina en `return result.slice(0, params.limit ?? 200)` (directory.ts:218). Con ese resultado se renderiza el header `— DIRECTORIO · {djs.length} DJs ACTIVOS` (page.tsx:134), el JSON-LD `numberOfItems: djs.length` (page.tsx:332) y la grilla completa (`gridDjs.map`). La base cacheada sí trae hasta 2000 (getPublicDjsBase limita a 2000), pero el slice a 200 corta antes. El propio comentario de la query dice que la campaña apunta a ~861 DJs.
- **Impacto:** En cuanto el directorio pase de 200 DJs (la campaña ya apunta a ~861) el contador dirá '200 DJs ACTIVOS' aunque haya muchos más, y la grilla solo mostrará 200 sin paginación ni 'ver más'. DJs reales quedan invisibles en el directorio público y el número de portada queda mal — todo en silencio, sin error.
- **Fix:** Pasar un `limit` explícito y alto (p.ej. 2000, alineado con el cap de la base) en la llamada de /dj, o mejor: separar el conteo real (`base.length` tras filtros) de la lista paginada y agregar paginación/'cargar más'. Como mínimo, que `djs.length` del header refleje el total filtrado, no la página recortada.
- **Verificación:** El código confirma cada afirmación del hallazgo, sin mitigación en otro lado. En src/app/dj/page.tsx:68-74 se llama `listPublicDjs({ search, city, genres, onlyAvailable })` SIN pasar `limit`. En src/lib/queries/directory.ts:218 la función termina en `return result.slice(0, params.limit ?? 200)` → con limit ausente corta a 200. La lectura base `getPublicDjsBase` SÍ sube el cap a 2000 (directory.ts:…

### 🟠 [MEDIO] "Disponible hoy" se calcula con fecha UTC, no con la fecha de Chile · _confirmado_
- **Dónde:** `src/lib/queries/directory.ts:80 (calcIsAvailable) y src/app/p/[slug]/page.tsx:107`  · tipo: bug
- **Qué:** `calcIsAvailable` usa `const date = checkDate ?? new Date().toISOString().slice(0, 10)` → eso es la fecha en UTC. En el press kit se repite el mismo patrón: `const today = new Date().toISOString().slice(0, 10)` (page.tsx:107). Chile (America/Santiago) está en UTC-3/UTC-4, así que durante las horas de la tarde-noche chilena el 'today' UTC ya saltó al día siguiente. El comparativo es contra `available_from`/`available_until` que el DJ setea pensando en fechas de Chile.
- **Impacto:** En la franja nocturna de Chile (aprox. 20:00–00:00) el sistema ya considera 'mañana'. Un DJ cuyo available_until es hoy deja de aparecer como disponible varias horas antes de que termine el día en Chile; y un available_from de mañana puede activarse antes de tiempo. Afecta el badge 'Disponible', el filtro 'Solo disponibles' y el orden 'disponibles primero'. El resto del codebase ya formatea TODO explícitamente en America/Santiago (lib/format.ts), así que esto es una inconsistencia real con el contrato de tz del proyecto.
- **Fix:** Calcular el 'hoy' en zona Chile, p.ej. `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date())` (en-CA da YYYY-MM-DD) y usar eso como `date`/`today` en ambos lugares. Centralizar en un helper en lib/format.ts o lib/tz.ts para no repetir el bug.
- **Verificación:** El hallazgo es REAL y verificable en el código citado. directory.ts:80 dice literalmente `const date = checkDate ?? new Date().toISOString().slice(0, 10)` y el propio comentario lo admite: "YYYY-MM-DD. Default: hoy (UTC)". page.tsx:106 repite el patrón: `const today = new Date().toISOString().slice(0, 10)`. Ese `today` UTC alimenta el badge is_available_now (directory.ts:164), el filtro onlyAvaila…

### ⚪ [BAJO] El press kit público (/p/[slug]) no define OG image ni canonical · _confirmado_
- **Dónde:** `src/app/p/[slug]/page.tsx:26-48 (generateMetadata)`  · tipo: friccion
- **Qué:** `generateMetadata` arma title/description y un openGraph con `type: 'profile'` pero SIN `images` y SIN `alternates.canonical`. Compárese con el landing (page.tsx:30-45, con og.png 1200x630) y con /dj (alternates.canonical a dropgigs.com/dj). El press kit es justamente la URL que los DJs comparten en IG/WhatsApp/flyers (hay UTMs y share-tools para eso).
- **Impacto:** Al pegar el link del press kit en WhatsApp/IG/Twitter no aparece una preview con imagen (cae al default del sitio o a nada), lo que baja el CTR del link que más comparten los DJs. La falta de canonical permite que variantes con UTMs/query se indexen como URLs duplicadas. Es la superficie más compartida de la app, así que el impacto de marca/conversión no es menor.
- **Fix:** En generateMetadata del press kit agregar `openGraph.images` usando `profile.hero_image_url`/`avatar_url` (validando isSupabaseStorageUrl, con fallback a /og.png) y `alternates: { canonical: \`https://dropgigs.com/p/${slug}\` }`. Idealmente twitter card también.
- **Verificación:** El código citado (src/app/p/[slug]/page.tsx:39-47) efectivamente arma openGraph con title/description/type:"profile" SIN images y SIN alternates.canonical. La comparación del hallazgo es exacta: el landing (src/app/page.tsx:41-43) y el layout raíz (src/app/layout.tsx:42-51) sí declaran og.png 1200x630, y /dj (src/app/dj/page.tsx:35-37) sí declara alternates.canonical. El fix es viable: getProfileB…

### ⚪ [BAJO] getTopFollowedDjs lee booker_favorites sin límite (cap implícito 1000)
- **Dónde:** `src/lib/queries/directory.ts:294-298`  · tipo: bug
- **Qué:** `admin.from('booker_favorites').select('dj_user_id').gte('created_at', cutoff)` no usa `.limit()` ni `count`. Supabase devuelve máximo 1000 filas por default. El ranking adaptativo del landing ('Los más seguidos del mes') agrega esos favoritos en memoria para contar seguidores.
- **Impacto:** Hoy en beta es inofensivo (pocos favoritos), pero si en 30 días hay >1000 registros en booker_favorites el conteo de seguidores se corta en silencio y el ranking 'más seguidos' queda sesgado/incorrecto, sin ningún error visible. Es el gotcha documentado de paginación del proyecto.
- **Fix:** Hacer la agregación en SQL (RPC que devuelva dj_user_id + count agrupado, como ya se hizo con presskit_event_daily en 0047) o, como mínimo, subir el `.limit()` y dejar claro el tope. Bajo porque depende de volumen futuro.

### ⚪ [BAJO] El conteo de las colecciones 'DROP. RECOMIENDA' puede cortarse a 200
- **Dónde:** `src/app/page.tsx:96-101`  · tipo: bug
- **Qué:** `count: (await listPublicDjs({ genres: c.genres })).length` cuenta cuántos DJs matchean una colección, pero `listPublicDjs` devuelve `slice(0, 200)` (directory.ts:218). El número que se muestra en la tarjeta ('N DJs · abrir en el directorio') sale de ese length.
- **Impacto:** Si una colección (p.ej. 'house') llega a matchear >200 DJs, la tarjeta dirá '200 DJs' como máximo aunque haya más. Hoy con el dataset chico no se nota; es el mismo cap silencioso, en versión cosmética. Bajo porque solo afecta un número de marketing, no la navegación (el link igual abre el filtro real en /dj).
- **Fix:** Para conteos usar un length sin cap (filtrar la base directamente o pasar un limit alto), o aceptar mostrar '200+' explícitamente. Se resuelve junto con el fix del cap de 200 en listPublicDjs.

### ⚪ [BAJO] JSON-LD: numberOfItems no coincide con los ítems listados
- **Dónde:** `src/app/dj/page.tsx:332-347`  · tipo: friccion
- **Qué:** El ItemList declara `numberOfItems: djs.length` pero `itemListElement` solo incluye `djs.slice(0, 50)`. Si hay más de 50 DJs (y además djs.length ya viene capeado a 200), numberOfItems y la cantidad real de ítems del array divergen.
- **Impacto:** Inconsistencia menor de structured data; algunos validadores de Google la marcan como warning. No rompe el render ni la página. Bajo.
- **Fix:** Hacer que numberOfItems refleje la cantidad realmente listada (`Math.min(djs.length, 50)`) o, si se quiere declarar el total, incluir todos los ítems. Coordinar con el fix del cap de 200 para que el total sea real.

---

## Eventos públicos (RA-7)

_La zona está mayormente sólida: el RSVP usa admin client correctamente (calendar_events es owner-only en RLS), chequea {error} en insert/update, dedupe vía índice único (event_id, lower(email)) con fallback robusto, escapeHtml en el email a fans, cap síncrono con log, y la tz Chile se aplica bien con timeZone:"America/Santiago". Encontré 1 bug de seguridad/UX alto (baja por GET = desuscripción accidental por escáneres de correo), varias fricciones medias (cap silencioso de 1000 filas en dos conteos/listas, DJ baneado puede seguir gestionando su evento, update optimista del contador "van" inflable, falta estado de carga en el feed) y algunos hallazgos menores._

### 🟠 [MEDIO] La baja de avisos se ejecuta por GET → escáneres de correo desuscriben fans sin que ellos hagan clic · _confirmado_
- **Dónde:** `src/app/api/unsubscribe/route.ts:60-62 + src/lib/queries/events.ts:499`  · tipo: bug
- **Qué:** El link 'Cancelar avisos' del email a fans es un <a href="${unsubUrl}"> plano (events.ts:499) que apunta a GET /api/unsubscribe?rsvp=...; el handler GET ejecuta unsubscribeFanByRsvp(rsvp) y apaga notify_future (route.ts:60-62). Los escáneres de seguridad de correo (Outlook SafeLinks, antivirus corporativos, prefetchers de Gmail) siguen automáticamente los GET de los emails → desuscriben al fan sin que jamás haga clic. La acción muta estado (UPDATE) en un GET, que por contrato HTTP debe ser idempotente/seguro.
- **Impacto:** Fans dejan de recibir avisos de próximos shows que sí querían recibir, en silencio. El DJ pierde re-engagement de su audiencia (justamente el loop fan→lead→aviso que es el corazón de RA-7) sin que nadie lo note.
- **Fix:** Que el GET muestre una página de confirmación con un botón/POST (o un form) que recién ahí ejecute la baja; o exigir un segundo paso. Mantener el POST one-click para el header List-Unsubscribe (Gmail), pero NO ejecutar la baja en el GET directo del <a href>. Alternativamente, firmar el rsvpId con un token de un solo uso ligado a la acción.
- **Verificación:** El hallazgo es real. El código dice exactamente lo afirmado: events.ts:488,499 construye un <a href="${SITE}/api/unsubscribe?rsvp=..."> plano (GET) como UNICO mecanismo de baja en el footer del email a fans; no manda header List-Unsubscribe/List-Unsubscribe-Post, así que el GET es el único camino y queda 100% expuesto a escáneres. route.ts:60-62 (handler GET) ejecuta await unsubscribeFanByRsvp(rsv…

### ⚪ [BAJO] El conteo de fans a avisar y el listado de RSVPs opt-in se cortan en 1000 filas en silencio · _confirmado_
- **Dónde:** `src/lib/queries/events.ts:440-444`  · tipo: bug
- **Qué:** notifyFansOfEvent junta los RSVPs opt-in del DJ con admin.from('event_rsvps').select('id,email,name,event_id').eq('notify_future',true).in('event_id',ids) SIN .limit ni rango → el select de Supabase trae máximo 1000 filas por defecto. El cap SYNC_CAP=50 (events.ts:477) se aplica DESPUÉS de este fetch, así que el problema no es el envío sino que el universo de candidatos se trunca a 1000 antes de deduplicar por email. Un DJ con muchos eventos/RSVPs históricos vería un subconjunto arbitrario (ordenado por lo que devuelva PG).
- **Impacto:** Hoy con volumen beta no se nota, pero es un cap silencioso: a futuro la lista de a-quién-avisar quedaría sesgada/incompleta sin error ni warning, contradiciendo el comentario que dice 'cap 100 (si crece, mover a cron)'.
- **Fix:** Agregar .limit(N alto) explícito o paginar por rango, y/o el warning de truncación que ya existe para SYNC_CAP debería medirse contra el universo real (no contra lo ya truncado). Idealmente mover a cron como dice el comentario antes de que importe.
- **Verificación:** El código en src/lib/queries/events.ts:440-444 dice exactamente lo que afirma el hallazgo: admin.from("event_rsvps").select("id,email,name,event_id").eq("notify_future",true).in("event_id",ids) SIN .limit, sin .range y sin count head:true. El cliente admin (src/lib/supabase/admin.ts) usa config default — no setea db.schema ni nada que altere el límite, y postgrest-js (2.108.0) no tiene un límite c…

### ⚪ [BAJO] Un DJ suspendido/baneado puede seguir entrando a gestionar y publicar su evento · _confirmado_
- **Dónde:** `src/lib/queries/events.ts:305-321 (getMyEvent) y 372-414 (setEventPublished)`  · tipo: bug
- **Qué:** La página pública /e/[token] y el feed sí excluyen DJs con account_status != 'active' (events.ts:60-62 y 180). Pero el lado owner NO chequea account_status: getMyEvent solo filtra por user_id, y setEventPublished/notifyFansOfEvent tampoco verifican el estado de la cuenta. Un DJ baneado puede abrir /calendario/[id]/evento, pulsar 'Publicar' y disparar notifyFansOfEvent → manda emails desde dropgigs.com a sus fans.
- **Impacto:** Inconsistencia con la regla A1 (cuenta no-activa no debería poder operar). Un DJ moderado/baneado todavía emite correos a fans con la marca DROP., justo lo que la suspensión debería frenar. La página pública igual ocultaría el evento, pero el email ya salió.
- **Fix:** Chequear account_status='active' en setEventPublished (y/o getMyEvent) antes de publicar y antes de notifyFansOfEvent; si no está activa, devolver error. Idealmente reutilizar el mismo guard que ya usa el resto de la app.
- **Verificación:** El hallazgo apunta a código real y la asimetría que describe existe. En src/lib/queries/events.ts el lado público sí filtra account_status: getEventByToken (líneas 56-62) y getUpcomingPublicEvents (líneas 145, 180) descartan al DJ no-activo con comentario "A1". El lado owner NO lo hace: getMyEvent (305-321) solo filtra por user_id; setEventPublished (372-414) solo valida user_id + type==='show'; y…

### ⚪ [BAJO] going_count del feed puede subcontar: el fetch de RSVPs 'going' está topado a 1000 filas
- **Dónde:** `src/lib/queries/events.ts:148-152`  · tipo: bug
- **Qué:** getUpcomingPublicEvents trae los RSVPs going con admin.from('event_rsvps').select('event_id').eq('status','going').in('event_id',eventIds) sin .limit → cap default 1000. Luego cuenta en memoria por evento (events.ts:171-174). Si la suma de going across los ~200 eventos del feed supera 1000, los contadores 'N van' de las tarjetas más abajo en la lista quedan subcontados sin error.
- **Impacto:** El badge 'N van' del feed mostraría menos asistentes de los reales en escenarios de mucho volumen. Cosmético y solo a escala grande, por eso bajo. (Nota: getEventByToken sí usa count head:true y NO sufre esto, está bien.)
- **Fix:** Hacer el conteo por evento con count head:true por separado, o subir el .limit explícitamente, o (mejor) una RPC/vista que agregue going_count en SQL.

### ⚪ [BAJO] El contador 'van' se infla con cada RSVP repetido del mismo fan
- **Dónde:** `src/app/e/[token]/rsvp-form.tsx:46-47 + src/lib/queries/events.ts:257-263`  · tipo: friccion
- **Qué:** createRsvp devuelve going_count vía count head:true real (correcto, dedupe por email). PERO el usuario percibe rareza: si el mismo fan reenvía el form (cambia 'voy'→'quizás'→'voy', o re-confirma), el count que ve refleja el total real, mientras que su acción anterior ya contaba. No hay bug de doble-conteo en DB (el índice único lo impide), pero el form no resetea ni avisa que ya estaba registrado: muestra siempre la pantalla 'done' como si fuera nuevo RSVP. Además no hay maxLength en el input de email/nombre del lado cliente (el server sí corta a 200/120).
- **Impacto:** UX confusa en re-envíos: el fan no sabe si su cambio de 'voy' a 'quizás' se registró (la pantalla done dice según el último status, pero el copy no distingue 'actualizamos tu RSVP' de uno nuevo). No hay pérdida de datos.
- **Fix:** Distinguir en la respuesta si fue insert vs update y ajustar el copy ('Actualizamos tu respuesta'). Opcional: deshabilitar el botón tras éxito y reflejar el estado real.

### ⚪ [BAJO] El feed /eventos y la página /e/[token] no tienen estado de carga ni manejo de error de la query
- **Dónde:** `src/app/eventos/page.tsx:32-33 + src/lib/queries/events.ts:114-123`  · tipo: friccion
- **Qué:** getUpcomingPublicEvents y getEventByToken ignoran el {error} de Supabase: solo desestructuran {data} (events.ts:114 'const { data: rows }', :44 'const { data: ev }', :54 :65, etc.). Si la query falla (timeout, RLS, red), data es null y el feed renderiza el empty-state 'Aún no hay eventos publicados' como si no hubiera eventos — un fallo se disfraza de estado vacío legítimo. Mismo patrón en getEventByToken: un error de DB devolvería null → notFound() (404) en vez de un 500/retry.
- **Impacto:** Un incidente transitorio de DB se muestra al público como 'no hay eventos' o '404 evento no encontrado', sin señal para el equipo ni opción de reintento para el usuario.
- **Fix:** Capturar el {error} de cada query, loguearlo (console.error/usage_events) y diferenciar fallo de DB (mostrar estado de error/reintento) de vacío real. Al menos no tratar error===vacío.

### ⚪ [BAJO] Republicar tras despublicar reusa el token viejo (que ya circuló) sin re-avisar — comportamiento sutil sin aviso al DJ
- **Dónde:** `src/lib/queries/events.ts:399-413 + src/app/(app)/calendario/[id]/evento/actions.ts:19-27`  · tipo: friccion
- **Qué:** firstPublish = publish && !token (events.ts:401): solo la PRIMERA publicación genera token y avisa a fans. Al despublicar (is_public=false) el token se conserva (no se borra), así que al republicar firstPublish=false → no se re-genera token ni se re-avisa. Es intencional (evita spam), pero tiene un efecto colateral no comunicado: un link que el DJ despublicó 'para que deje de funcionar' (copy del confirm en evento-manager.tsx:100) vuelve a funcionar con el MISMO token si republica, y cualquiera que guardó ese link lo recupera. No hay forma de rotar el token.
- **Impacto:** El DJ cree que despublicar invalida el link permanentemente ('El link dejará de funcionar'), pero al republicar el mismo link resucita. Edge raro, sin pérdida de datos, pero el modelo mental del copy no calza con el comportamiento.
- **Fix:** Aclarar el copy ('se desactiva temporalmente; volverá a funcionar si republicas') o, si se quiere baja real, regenerar public_token al despublicar (asumiendo el costo de que el link viejo muera de verdad).

---

## Press kit del DJ (owner) + bookings

_La zona está mayormente sana: rate-limit en endpoints públicos, sanitización de metadata en /api/track, ventana RA-5 alineada chart↔KPI con clamp de % y día Chile sin DST, RPC agregada sin cap de 1000, y la mayoría de los UPDATE chequean {error}. Encontré 8 hallazgos reales: 1 alto (UPDATE sin chequeo de error en convertBookingToContact → posible doble-contacto silencioso), varios medios (window de bookings con DST a mano inconsistente con el resto del archivo, track/booking aceptan DJs suspendidos, falta cap de longitud en el form público anónimo, event_date sin validar → posible crash en agendar) y bajos (comentario con dominio stale drop.dj, acceso a series[0] sin datos)._

### 🟠 [MEDIO] convertBookingToContactAction: el UPDATE final no chequea {error} → crea contacto pero deja el booking sin linkear (doble contacto en reintentos) · _confirmado_
- **Dónde:** `src/app/(app)/press-kit/actions.ts:105-109`  · tipo: bug
- **Qué:** Tras crear el contacto con createContact(), el UPDATE de booking_form_submissions ({ status: 'respondido', created_contact_id: contact.id }) se hace sin capturar ni chequear el {error} que devuelve Supabase: `await supabase.from("booking_form_submissions").update({...}).eq("id", bookingId).eq("user_id", user.id);`. Es exactamente el gotcha de RLS del codebase: si el UPDATE falla o matchea 0 filas (no-op silencioso), la función igual retorna {ok:true, data:{contact_id}}. El contacto ya quedó creado en /crm, pero el booking conserva created_contact_id=null. La UI (booking-actions.tsx) muestra de nuevo 'Convertir en contacto del CRM' porque !contactId sigue siendo true. Nota: a diferencia de updateBookingStatus() y updateBookingWorkflow() en presskit.ts que SÍ hacen `if (error) throw`, acá se omite.
- **Impacto:** El DJ que reintenta 'Convertir en contacto' crea un segundo (y tercer) contacto duplicado del mismo booking en su CRM, sin ninguna señal de error. Pérdida de integridad de datos del CRM y confusión en seguimiento de leads.
- **Fix:** Capturar el error del UPDATE final: `const { error: updErr } = await supabase.from('booking_form_submissions').update({...})...; if (updErr) throw new Error(updErr.message);`. Idealmente envolver creación de contacto + update en una sola RPC transaccional para que no quede el contacto huérfano si el update falla.
- **Verificación:** El código en src/app/(app)/press-kit/actions.ts:105-109 dice exactamente lo que afirma el hallazgo: el UPDATE final (status:'respondido', created_contact_id: contact.id) NO destructura ni chequea {error}, a diferencia de recounterAction en el mismo archivo (líneas 280-285: const { error } = ...; if (error) throw new Error(error.message)) y de las funciones de presskit.ts. Verifiqué la cadena compl…

### 🟠 [MEDIO] Formulario público de booking sin límite de longitud en name/message/venue/event_type (endpoint anónimo) · _confirmado_
- **Dónde:** `src/app/api/booking/route.ts:88-100`  · tipo: friccion
- **Qué:** POST /api/booking es público y anónimo (rate-limit 10/min por IP, que el propio lib documenta como evadible vía cold starts / multi-instancia). Los campos se insertan con solo .trim() y sin tope de longitud: createBookingSubmission() (presskit.ts:79-95) graba name, message, venue, event_type, phone tal cual. Contraste directo con /api/track, que sí sanea metadata (máx 16 keys, valores ≤200 chars, keys ≤64). Un script puede mandar un message de varios MB por request.
- **Impacto:** Vector de abuso de almacenamiento y de la bandeja del DJ: la lista de bookings (page.tsx) y el detalle renderizan name/message/venue directamente; un payload gigante infla la tabla y degrada la UI del owner (aunque React escapa el texto, no hay XSS). Coherencia: el otro endpoint público ya capea, este no.
- **Fix:** Aplicar límites de longitud en /api/booking antes de insertar: ej. name ≤120, email/phone ≤200, event_type/venue ≤200, message ≤4000. Truncar o rechazar con 400. Reusar el mismo criterio defensivo que /api/track.
- **Verificación:** Hallazgo REAL. Verifiqué el código real:

(a) src/app/api/booking/route.ts:88-100 — el handler POST público/anónimo llama createBookingSubmission pasando name/email/phone/event_type/venue/message con SOLO .trim(), sin ningún tope de longitud. Las únicas validaciones son: user_id requerido (45-48), name no-vacío (49-51) y al menos un contacto email|phone (52-60). Ningún límite de tamaño.

(b) La qu…

### ⚪ [BAJO] Stats: la ventana de 'Solicitudes' resta 86400000 ms fijos (DST a mano), inconsistente con el resto del archivo que ya es DST-safe · _confirmado_
- **Dónde:** `src/app/(app)/press-kit/stats/page.tsx:122-123`  · tipo: bug
- **Qué:** Para filtrar los bookings del rango se usa `const sinceTs = Date.now() - days * 86400000;` y luego `bookings.filter(b => new Date(b.created_at).getTime() >= sinceTs)`. Esto resta días como milisegundos fijos sobre el instante actual — exactamente el anti-patrón que el comentario M7 de santiagoDay() (líneas 25-40 del mismo archivo) dice evitar porque 'en el cambio de hora chileno un día dura 23h/25h y eso corría el bucket un día'. Además es una ventana MÓVIL por instante, mientras el chart y los KPIs usan windowDays (días-calendario completos en hora de Chile). Resultado: el contador de 'Solicitudes (N)' del bloque inferior no usa la misma ventana que el KPI 'Solicitudes' (formSubmits, derivado del RPC alineado a días-calendario), pudiendo diferir en el día borde.
- **Impacto:** El conteo de solicitudes en el rango puede incluir/excluir un booking del día límite de forma distinta al KPI superior y al chart, especialmente alrededor del cambio de horario chileno (abril/septiembre). El DJ ve dos números de 'Solicitudes' que no coinciden.
- **Fix:** Filtrar bookings por la fecha-calendario Chile usando el mismo windowSet/windowDays que ya se calcula para el chart: derivar el día Chile de b.created_at (toLocaleDateString('en-CA',{timeZone:'America/Santiago'})) y comprobar windowSet.has(day), en vez de comparar timestamps con 86400000.
- **Verificación:** El código en src/app/(app)/press-kit/stats/page.tsx:122-123 dice exactamente lo que afirma el hallazgo: `const sinceTs = Date.now() - days * 86400000;` y luego `bookings.filter(b => new Date(b.created_at).getTime() >= sinceTs)`. Esto es el anti-patrón de restar ms fijos sobre el instante actual que el comentario M7 de santiagoDay() (líneas 25-40 del MISMO archivo) documenta explícitamente como inc…

### ⚪ [BAJO] /api/track y /api/booking aceptan eventos/bookings de DJs suspendidos o baneados (validan dj_profile sin account_status) · _confirmado_
- **Dónde:** `src/app/api/track/route.ts:73-85`  · tipo: bug
- **Qué:** getProfileBySlug() (presskit.ts:29) filtra `.eq('account_status','active')` para no exponer DJs suspendidos/baneados en /p/[slug] (404). Pero /api/track valida el user_id solo con `admin.from('dj_profile').select('user_id').eq('user_id', user_id).maybeSingle()` SIN filtrar account_status, y /api/booking → createBookingSubmission() inserta sin validar el estado de la cuenta. Un atacante (o un link viejo cacheado) puede seguir mandando POSTs a /api/track y /api/booking con el user_id de un DJ suspendido y se siguen escribiendo presskit_events y booking_form_submissions para una cuenta que el admin quiso desactivar.
- **Impacto:** DJs suspendidos/baneados siguen acumulando bookings y métricas; los datos del press kit de una cuenta moderada siguen creciendo en silencio. Inconsistencia con la decisión A1 de no exponer cuentas no-activas.
- **Fix:** En /api/track agregar `.eq('account_status','active')` al SELECT de validación; en createBookingSubmission()/route.ts validar que el dj_profile destino esté active antes de insertar (o reusar getProfileBySlug-style check). Devolver 404/410 si no está activo.
- **Verificación:** El código confirma el hallazgo al pie de la letra. En src/app/api/track/route.ts:74-78 la validación es `admin.from("dj_profile").select("user_id").eq("user_id", user_id).maybeSingle()` SIN `.eq("account_status","active")`. En src/lib/queries/presskit.ts:64-103 createBookingSubmission() inserta en booking_form_submissions vía admin client sin chequear estado, y /api/booking/route.ts tampoco lo val…

### ⚪ [BAJO] event_date no se valida como fecha: un valor malformado vía POST directo puede romper agendar (Invalid Date en santiagoToUtcISO)
- **Dónde:** `src/lib/queries/presskit.ts:356-362`  · tipo: bug
- **Qué:** En updateBookingWorkflow (branch agendado), `const startAt = new Date(santiagoToUtcISO(eventDate, '22:00:00'))`. eventDate viene de patch.event_date o b.event_date. El form público usa <input type=date> (formato OK en browser), pero /api/booking acepta JSON arbitrario y guarda event_date sin validar formato (route.ts:94, `event_date: body.event_date || null`). Si llega un string no-fecha (ej '2026-13-99' o 'lol'), santiagoToUtcISO hace `new Date('lol T22:00:00Z')` → Invalid Date, y aguas abajo `startAt.toISOString()` lanza RangeError → la transición a 'agendado' tira 500 sin manejo específico. El comentario de la línea 360-362 ya documenta haber arreglado un crash previo de Invalid Date, lo que confirma la fragilidad de este path.
- **Impacto:** Edge raro pero real: un booking con event_date corrupto (insertado vía API directa) hace que el botón 'Agendar' del DJ falle con error genérico y no pueda agendar ese booking sin editar la fecha a mano.
- **Fix:** Validar event_date con un regex YYYY-MM-DD y/o `!isNaN(Date.parse(...))` en /api/booking antes de insertar, y/o en updateBookingWorkflow antes de construir startAt (si Invalid Date, lanzar 'Fecha del evento inválida' en vez de dejar reventar toISOString).

### ⚪ [BAJO] claimBookingsByEmail linkea TODOS los bookings huérfanos que matcheen el email del booker, sin verificación adicional
- **Dónde:** `src/lib/queries/booker.ts:517-545`  · tipo: friccion
- **Qué:** claimBookingsByEmail() hace un UPDATE con service_role seteando booker_user_id=user.id sobre todo booking con email ilike user.email y booker_user_id IS NULL. El email proviene de user.email (verificado por Supabase auth) y el escapeo de %/_ está bien hecho, así que el riesgo es bajo. Pero el claim es puramente por coincidencia de email: si dos personas distintas alguna vez usaron el mismo email en el form (o un booker pone el email de otro), el que haga signup con ese email se queda con esos requests. No hay confirmación ni doble factor; es un backfill de confianza-en-el-email.
- **Impacto:** Bajo en la práctica (email verificado), pero un booking enviado a nombre de un tercero con el email de ese tercero queda visible para quien controle esa casilla. Aceptable para MVP; vale dejarlo anotado.
- **Fix:** Documentar explícitamente la suposición (email verificado = dueño de los requests). Post-MVP, mover a la RPC `claim_bookings_by_email` ya planeada (TODO en booker.ts:503) y considerar registrar quién reclamó qué para auditoría.

### ⚪ [BAJO] Comentario en share-tools usa dominio stale 'drop.dj' (contradice dominio canónico dropgigs.com)
- **Dónde:** `src/app/(app)/press-kit/share-tools.tsx:27`  · tipo: error
- **Qué:** El JSDoc del prop publicUrl dice `Ej: https://drop.dj/p/jay-portu`. El dominio canónico es dropgigs.com desde 2026-05-29 (rebranding 100% completo). Además el handle/marca DROP.DJ no debe usarse en assets. Es solo un comentario (no afecta runtime, la URL real viene de NEXT_PUBLIC_SITE_URL en page.tsx:40), pero es información obsoleta y contradice la convención de marca.
- **Impacto:** Cosmético / mantenibilidad: confunde a quien lea el componente y reintroduce un dominio/handle que el equipo decidió no usar.
- **Fix:** Cambiar el ejemplo del comentario a `https://dropgigs.com/p/jay-portu`.

### ⚪ [BAJO] Stats: peak.day y series[0]/series[last] se acceden asumiendo array no vacío
- **Dónde:** `src/app/(app)/press-kit/stats/page.tsx:94`  · tipo: friccion
- **Qué:** `const peak = series.reduce((a,b)=> b.n>a.n?b:a, series[0])`. series siempre tiene `days` elementos (windowDays.map, days∈{7,30,90}) así que series[0] nunca es undefined hoy — está cubierto. Pero el render usa `peak && peak.n>0` y `series[0]?.day.slice(5)` con optional chaining inconsistente: el reduce no usa el `?.`. Si en el futuro windowDays pudiera quedar vacío (ej. days=0), el seed series[0] sería undefined y `b.n>a.n` reventaría. Es defensivo/menor dado el guard RANGES.includes.
- **Impacto:** Ninguno en el estado actual (RANGES garantiza days≥7). Riesgo latente si se agrega un rango '0 días' o 'hoy'.
- **Fix:** Hacer el peak seguro: `const peak = series.length ? series.reduce((a,b)=> b.n>a.n?b:a) : null;` y mantener los guards `peak && peak.n>0`. Consistencia con el optional chaining ya usado en las etiquetas de eje.

---

## CRM / contactos

_La zona está razonablemente sólida en RLS (todas las policies select/insert/update/delete own existen en 0002_crm.sql) y chequeo de errores Supabase. Los hallazgos reales se concentran en: import sin dedupe ni validación de email/whatsapp, un cap silencioso de 500 contactos que rompe los conteos/KPIs del header, el score del CSV que se descarta sin avisar, y buckets de fecha calculados en tz del server (UTC) en vez de Chile. Sin bugs de pérdida de datos ni fugas entre usuarios._

### 🔴 [ALTO] listContacts cap a 500 filas: el header y los KPIs mienten sobre 500 contactos · _confirmado_
- **Dónde:** `src/lib/queries/contacts.ts:101 + src/app/(app)/crm/page.tsx:97,163`  · tipo: bug
- **Qué:** listContacts termina en `.limit(500)`. El brief de la zona dice cap 1000, pero el código corta en 500 (y aun 1000 sería el default silencioso de PostgREST). La página deriva TODO de ese array truncado: el hero `{String(contacts.length).padStart(2,"0")} CONTACTOS` (page.tsx:97), el KPI TOTAL (page.tsx:163), VENUES, EN PIPELINE y SCORE PROMEDIO se calculan en memoria sobre `contacts` (page.tsx:70-84). Con >500 contactos el usuario ve '500 CONTACTOS' y promedios calculados solo sobre las primeras 500 filas, sin ningún aviso. Existe `countContacts()` (contacts.ts:252) que trae el total real pero la página NO lo usa.
- **Impacto:** Un DJ con agenda grande (el import masivo lo hace trivial) ve un total falso y KPIs sesgados; contactos con score bajo desaparecen de la lista sin indicación de que hay más. Decisiones de pipeline sobre datos incompletos.
- **Fix:** Para los KPIs/total usar countContacts() (o un count head:true) en vez de contacts.length. Para la lista, o paginar de verdad (rango + 'cargar más') o subir el limit y mostrar un aviso 'mostrando primeros N' cuando se alcanza el tope. No derivar totales de un array capado.
- **Verificación:** El hallazgo es REAL y se verifica al pie de la letra. (a) Código confirmado: src/lib/queries/contacts.ts:99-101 termina la query en `.order(orderBy, {ascending, nullsFirst:false}).limit(500)` — cap explícito en 500, no en el "1000" que el brief alega ni en el default silencioso de PostgREST. En src/app/(app)/crm/page.tsx:53-62 la página deriva TODO del array `contacts` retornado por listContacts: …

### 🟠 [MEDIO] Import CSV no detecta duplicados · _confirmado_
- **Dónde:** `src/lib/queries/contacts.ts:232-250 (bulkInsertContacts) + src/app/(app)/crm/importar/import-form.tsx:114-140`  · tipo: bug
- **Qué:** bulkInsertContacts hace un `.insert(payload)` directo sin ON CONFLICT/upsert ni chequeo previo contra contactos existentes (grep de dedup/duplicat/onConflict/upsert en toda la zona: 0 matches). El preview tampoco compara contra la base. Importar el mismo CSV dos veces, o un CSV que solape con contactos ya creados a mano, crea filas duplicadas idénticas sin avisar.
- **Impacto:** El CRM se ensucia con duplicados (mismo venue/booker repetido), inflando conteos y rompiendo el sentido del pipeline. Re-importar para 'actualizar' (flujo natural del usuario) no actualiza: duplica.
- **Fix:** Definir clave natural (ej. user_id + lower(name) o email/whatsapp normalizado) y, en el import, o saltar duplicados marcándolos en el preview, o upsert por esa clave. Como mínimo, advertir en el preview cuántas filas chocan con contactos existentes.
- **Verificación:** El hallazgo es real. bulkInsertContacts (src/lib/queries/contacts.ts:244-247) hace un .insert(payload) plano: sin onConflict, sin upsert, sin chequeo previo contra contactos existentes. El form (src/app/(app)/crm/importar/import-form.tsx:33-140) solo valida que name no esté vacío (_ok); handlePreview nunca compara contra la base ni avisa de choques. Verifiqué que no hay mitigación en otra capa: (1…

### 🟠 [MEDIO] El score del CSV se ignora silenciosamente (la doc dice lo contrario) · _confirmado_
- **Dónde:** `src/app/(app)/crm/importar/page.tsx:48 + import-form.tsx:75-77,96 + src/lib/queries/contacts.ts:238-242`  · tipo: bug
- **Qué:** La página de import documenta 'score debe ser número entre 0 y 100' (page.tsx:48) y el form parsea/valida la columna score (import-form.tsx:75-77) y la muestra en el preview (col 'Score', línea 201). Pero bulkInsertContacts recalcula score con applyAutoScore para CADA fila y sobreescribe lo que venga en el payload (`return { ...r, score, score_reason, ... }`, contacts.ts:241). El score del CSV nunca llega a la DB.
- **Impacto:** El usuario rellena la columna score, la ve en el preview, importa, y el valor se pierde sin aviso. La doc promete algo que el código no cumple.
- **Fix:** O respetar el score del CSV cuando viene explícito (no recalcular esas filas), o quitar la columna score de la doc/preview y dejar claro que el score es 100% automático en import.
- **Verificación:** Confirmado en su totalidad. Tracé la cadena completa: (1) page.tsx:48 documenta 'score' como columna reconocida (y el ejemplo de la doc en líneas 33-34 incluye scores 88/76); (2) import-form.tsx:75-77 parsea/clampa el score y lo pone en el payload (línea 96 'score: safeScore') y lo muestra en el preview (línea 201 '{r.score}'); (3) handleImport (líneas 122-127) solo quita _ok/_error, así que el sc…

### 🟠 [MEDIO] Sin validación de email/WhatsApp en servidor ni en import · _confirmado_
- **Dónde:** `src/lib/queries/contacts.ts:150-161 (createContact), 232-250 (bulkInsert) + import-form.tsx:54-102`  · tipo: error
- **Qué:** createContact/updateContact/bulkInsertContacts insertan email y whatsapp tal cual sin validar formato. El form manual solo se apoya en `type="email"` del navegador (contact-form.tsx:265), que no aplica en el path de import (que acepta cualquier string como email/whatsapp). El WhatsApp no se valida en ningún lado al guardar; recién whatsappLink() (format.ts:109-115) descarta <8 dígitos al renderizar el botón, pero el dato sucio queda guardado.
- **Impacto:** Emails y teléfonos malformados entran al CRM vía CSV y se usan luego en mailto:, wa.me y plantillas/campañas. Un email basura silenciosamente no produce botón de WhatsApp o genera un mailto roto, sin que el usuario sepa por qué.
- **Fix:** Validar email (regex simple) y normalizar/validar whatsapp (solo dígitos, largo mínimo con código país) tanto en el preview del import (marcar fila con _error) como server-side en create/bulkInsert.
- **Verificación:** Confirmado en código real. createContact (contacts.ts:150-161), updateContact (163-197) y bulkInsertContacts (232-250) insertan email/whatsapp tal cual; el único procesamiento es applyAutoScore, que solo lee los campos (scoring.ts:95,99 chequea .trim().length>0 = presencia, no formato). El import-form.tsx:54-102 valida únicamente name.length>0 (línea 80, _error "Sin nombre"); email (get("email"), …

### 🟠 [MEDIO] Badge 'hoy'/'atrasado' en recurrentes se calcula en tz del server (UTC), no Chile · _confirmado_
- **Dónde:** `src/app/(app)/crm/recurrentes/page.tsx:23,64-70`  · tipo: bug
- **Qué:** El componente es server component: `const now = new Date()` (línea 23) corre en UTC en Vercel. `dueToday` compara `due.getDate()/getMonth()/getFullYear()` contra `now.getDate()...` (líneas 66-70), todos en hora local del proceso (UTC). El proyecto tiene helpers de tz Chile (src/lib/tz.ts) y format.ts documenta explícitamente el problema UTC del SSR, pero acá se ignoran. Entre 20:00 y 23:59 hora Chile el server ya está en el día siguiente UTC, así que un follow-up que vence 'hoy' en Chile puede pintarse como mañana (o uno de mañana temprano como 'hoy'), y el cruce de medianoche del badge 'atrasado' también queda desfasado por el offset CLT/CLST.
- **Impacto:** El usuario chileno ve mal qué recurrencias vencen hoy vs mañana durante varias horas al día. La columna visible `dateTime(f.due_at)` sí está bien (usa tz), pero contradice el badge, lo que confunde.
- **Fix:** Calcular el bucket de día usando la fecha de pared en America/Santiago (Intl.DateTimeFormat con timeZone, como en tz.ts) tanto para 'now' como para 'due', en vez de getDate()/getMonth() locales del server.
- **Verificación:** El código en src/app/(app)/crm/recurrentes/page.tsx confirma el hallazgo. Línea 9: es un async server component, así que línea 23 `const now = new Date()` corre en UTC en Vercel. Líneas 66-70: `dueToday` compara `due.getDate()/getMonth()/getFullYear()` contra los mismos getters de `now`, todos campos de calendario LOCALES del proceso (UTC), sin tz. (Línea 65 `overdue = due < now` sí es comparación…

### ⚪ [BAJO] nextDueDate suma días/semanas con setDate sobre instante UTC (drift en DST)
- **Dónde:** `src/lib/queries/follow-ups.ts:159-169 + 219-225 (completeFollowUp)`  · tipo: bug
- **Qué:** nextDueDate hace `d.setDate(d.getDate()+value)` / `setMonth(...)` sobre un Date construido desde el ISO UTC, en hora local del server (UTC). Es el patrón 'sumar/restar a mano' que el brief marca como riesgo de tz. Como el server es UTC y se reserializa a ISO, el instante avanza N*24h exactas; al cruzar el cambio CLT↔CLST (abril/septiembre en Chile) la hora de pared del próximo follow-up se corre ±1h respecto a la original. Para 'months' además hereda el clásico edge del 31 → fin de mes.
- **Impacto:** Menor: los follow-ups recurrentes a la larga se desplazan una hora alrededor de los cambios de horario de verano; un recordatorio de las 10:00 puede pasar a 09:00/11:00. No rompe datos, solo deriva la hora.
- **Fix:** Calcular la próxima fecha en hora de pared de Santiago (sumar en componentes de fecha local Chile y reconvertir con santiagoToUtcISO) en vez de mutar un Date UTC.

### ⚪ [BAJO] ?score con valor no numérico rompe la lista en silencio
- **Dónde:** `src/app/(app)/crm/page.tsx:58 + src/lib/queries/contacts.ts:78`  · tipo: bug
- **Qué:** page.tsx:58 hace `minScore: sp.score ? parseInt(sp.score,10) : undefined`. Con un querystring manual `?score=abc`, parseInt→NaN, y en contacts.ts:78 `typeof params.minScore === 'number'` es true para NaN, así que se ejecuta `.gte('score', NaN)`. PostgREST rechaza el filtro → listContacts captura el error y devuelve [] (contacts.ts:103-106), mostrando 'Sin contactos' aunque haya.
- **Impacto:** Edge raro (la UI solo ofrece 40/60/80 por dropdown), pero un link compartido o tipeado a mano con score inválido muestra CRM vacío sin explicación.
- **Fix:** Validar: `const n = parseInt(sp.score,10); minScore = Number.isFinite(n) ? n : undefined`. Y/o en contacts.ts chequear `Number.isFinite(params.minScore)`.

### ⚪ [BAJO] RecurrentesActions exige contactId:string pero la fila puede no tenerlo
- **Dónde:** `src/app/(app)/crm/recurrentes/page.tsx:108,122-126 + recurrentes-actions.tsx:12-16`  · tipo: error
- **Qué:** La página trata f.contact_id como posiblemente vacío (línea 108: `f.contact_id ? `/crm/${f.contact_id}` : "/crm"`) pero pasa `contactId={f.contact_id}` a RecurrentesActions, cuyo prop es `contactId: string` (no opcional). Si contact_id fuera null/'', completeFollowUpAction(followUpId, contactId) recibe '' y el `revalidatePath(`/crm/${contactId}`)` revalida `/crm/` en vez de la ficha. En el schema actual contact_id es NOT NULL, así que es inconsistencia de tipos/contrato más que bug activo.
- **Impacto:** Inconsistencia latente: si alguna vez un follow-up queda sin contacto, la acción revalida la ruta equivocada y el deep-link al contacto apunta a /crm. Hoy no se dispara porque la columna es NOT NULL.
- **Fix:** Unificar el contrato: o el tipo FollowUp.contact_id es siempre string (entonces quitar el `? :` defensivo de la página) o hacer contactId opcional en RecurrentesActions y manejar el caso vacío como ya hace pauseRecurrenceAction/deleteRecurrenceSeriesAction (que reciben contactId?).

### ⚪ [BAJO] Errores de follow-up con alert() nativo en vez de UI consistente
- **Dónde:** `src/app/(app)/crm/[id]/follow-ups-section.tsx:71,84,93 + recurrentes-actions.tsx:31,44`  · tipo: friccion
- **Qué:** FollowUpsSection usa `alert("No se pudo crear el follow-up: ...")` (línea 71) y `confirm(...)` (líneas 84,93) para errores y confirmaciones; RecurrentesActions también usa confirm() nativo (líneas 31,44). El resto de la app migró a un sistema de diálogos propio (ver tarea histórica 'Sistema de diálogos (reemplaza popups nativos)'), así que esto quedó atrás. El form de contacto (contact-form.tsx:157) tiene el mismo confirm() nativo para borrar.
- **Impacto:** Fricción de consistencia: popups nativos del navegador rompen el look brutalist de DROP y no son estilables; en algunos navegadores/PWA pueden bloquearse.
- **Fix:** Migrar estos alert()/confirm() al sistema de diálogos unificado de la app, como ya se hizo en /admin.

### ⚪ [BAJO] updateContact/import/follow-ups no pasan por assertBetaActive (solo create sí)
- **Dónde:** `src/app/(app)/crm/actions.ts:41 (sí) vs 51-118 (no)`  · tipo: friccion
- **Qué:** createContactAction llama assertBetaActive() (actions.ts:41), coherente con beta-guard.ts cuyo doc dice 'crear o MODIFICAR datos nuevos'. Pero updateContactAction (51), importContactsAction (75), addInteractionAction (90) y addFollowUpAction (106) NO lo llaman. El mensaje de BetaExpiredError promete bloquear 'crear o modificar', y el import es justamente una vía de creación masiva sin el guard.
- **Impacto:** Un usuario con beta expired no puede crear un contacto a mano pero sí puede importar 500 por CSV, editar contactos y registrar interacciones/follow-ups. Inconsistencia de la política de beta más que bug funcional.
- **Fix:** Decidir el alcance del guard y aplicarlo de forma consistente: como mínimo añadir assertBetaActive() a importContactsAction (es creación), y evaluar update/addFollowUp/addInteraction según la política deseada.

---

## Calendario + tracklist

_Zona funcional pero con varios bugs reales de timezone/DST (los KPIs y el sync all_day calculan días en UTC del server, no en Santiago), una violación de marca (drop.dj), un endpoint público de webhook sin rate-limit ni protección SSRF, y varias escrituras a Supabase con error no chequeado o races en sort_order. Ninguno bloquea el flujo feliz, pero varios producen datos silenciosamente incorrectos._

### 🟠 [MEDIO] getFinanceKpis calcula el mes en hora del server (UTC), no en Santiago · _confirmado_
- **Dónde:** `src/lib/queries/calendar-events.ts:172-182`  · tipo: bug
- **Qué:** monthStart/nextMonth se construyen con `new Date(now.getFullYear(), now.getMonth(), 1)` y se mandan a Supabase con `.toISOString()`. En Vercel el server corre en UTC, así que getMonth()/getFullYear() devuelven el mes UTC, no el de Santiago. El comentario del archivo (format.ts) advierte justamente esto: 'Vercel SSR renderiza en UTC y se pierden 3-4 horas'. El filtro `gte('start_at', monthStart.toISOString())` queda corrido respecto al mes real chileno.
- **Impacto:** Gigs que caen en las primeras ~3-4h del día 1 (hora Chile) o en las últimas horas del último día del mes se atribuyen al mes equivocado. El KPI 'Cobrado este mes', 'Total gigs' y 'Pendiente cobro' del hero del calendario muestran montos incorrectos cerca de los bordes de mes. monthLabel sí usa timeZone Santiago, así que el label puede decir un mes mientras el filtro usa otro.
- **Fix:** Calcular los límites del mes en America/Santiago (ej. derivar año/mes con Intl.DateTimeFormat tz Santiago y construir el primer día del mes a medianoche Santiago, convertido a UTC) en vez de usar getFullYear()/getMonth() locales del server.
- **Verificación:** El código confirma el hallazgo. En src/lib/queries/calendar-events.ts:172-182, getFinanceKpis hace `const now = new Date()`, `monthStart = new Date(now.getFullYear(), now.getMonth(), 1)` y `nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1)`, y los envía a Supabase como `.gte("start_at", monthStart.toISOString())` / `.lt("start_at", nextMonth.toISOString())`. El constructor `new Date(y,m…

### 🟠 [MEDIO] Texto SoundCloud del editor usa 'drop.dj' (marca prohibida) · _confirmado_
- **Dónde:** `src/app/(app)/calendario/[id]/tracklist/tracklist-editor.tsx:307`  · tipo: bug
- **Qué:** buildSoundCloudText() agrega `lines.push("// powered by drop.dj");`. La versión server (formatSoundCloudDescription en tracklists.ts:311) correctamente usa 'powered by dropgigs.com'. El cliente quedó con el handle viejo.
- **Impacto:** El DJ copia el texto al describir su set en SoundCloud y publica 'drop.dj', que no es la marca/dominio oficial (dropgigs.com / @drop.gigs). Difusión pública de marca incorrecta y dominio que no controlamos.
- **Fix:** Cambiar a `// powered by dropgigs.com` para igualar el server, o mejor reusar formatSoundCloudDescription en vez de duplicar el formato en el cliente.
- **Verificación:** Confirmado al re-leer el código. (a) tracklist-editor.tsx:307 dice textualmente `lines.push("// powered by drop.dj");` — exactamente lo que afirma el hallazgo. (b) No hay guard/sanitización: el string está hardcodeado. La versión server canónica en src/lib/queries/tracklists.ts:311 usa correctamente `lines.push("// powered by dropgigs.com");`, confirmando que el cliente quedó con el handle viejo (…

### 🟠 [MEDIO] Inputs datetime-local convierten con el offset del navegador, no de Santiago · _confirmado_
- **Dónde:** `src/app/(app)/calendario/event-edit.tsx:33-38`  · tipo: bug
- **Qué:** isoToLocalInput hace `new Date(d.getTime() - d.getTimezoneOffset()*60000)` para llenar el `datetime-local`, y al guardar se hace `new Date(startAt).toISOString()`. Lo mismo en new-event-button.tsx:41-52 (defaultStart/defaultEnd). Ambos usan getTimezoneOffset() del navegador del usuario, asumiendo que el DJ está físicamente en Chile. El GCal se crea con timeZone 'America/Santiago' (client.ts:93) fijo.
- **Impacto:** Si el DJ edita/crea desde un navegador con tz distinta a Santiago (viaje, gira, VPN, laptop mal configurada), la hora mostrada en el input y la que se manda difieren de lo que verá etiquetado como hora de Chile, y GCal la marca como Santiago de todos modos → el evento queda a una hora incorrecta. También en DST de Chile el offset del navegador chileno se ajusta solo, pero el de cualquier otra tz no se alinea con Santiago.
- **Fix:** Construir/parsear el datetime-local explícitamente en America/Santiago (no con getTimezoneOffset del browser), p.ej. usando un helper que formatee/parsee con Intl en esa tz, ya que toda la app trata las horas como hora de Chile.
- **Verificación:** El código cita correctamente. event-edit.tsx:33-38 (isoToLocalInput usa d.getTimezoneOffset() del navegador) y new-event-button.tsx:41-52 (defaultStart/defaultEnd con setMinutes(-getTimezoneOffset())). Al guardar, ambos hacen `new Date(startAt).toISOString()` sobre un string datetime-local sin offset, que JS parsea como hora LOCAL del navegador. client.ts:93/97/127 fija timeZone 'America/Santiago'…

### 🟠 [MEDIO] paid_at no se limpia al sacar un gig de 'pagado' · _confirmado_
- **Dónde:** `src/app/(app)/calendario/actions.ts:197-205`  · tipo: bug
- **Qué:** updateEventFinanceAction setea `patch.paid_at = now()` cuando payment_status pasa a 'paid' sin paid_at, pero nunca lo limpia cuando el estado cambia de 'paid' a 'pending'/'partial'/'none'. El patch que llega del dialog (finance-edit.tsx:54-58) ni siquiera incluye paid_at, así que el valor viejo queda en la fila.
- **Impacto:** Un gig que se marcó pagado por error y luego se corrige a pendiente conserva paid_at poblado. Cualquier reporte/exports de finanzas o lógica futura que use paid_at como 'está cobrado' dará un dato inconsistente (pendiente pero con fecha de pago).
- **Fix:** En updateEventFinanceAction, si payment_status pasa a un estado distinto de 'paid', forzar `patch.paid_at = null`.
- **Verificación:** El hallazgo es real en sus tres puntos.

(a) El código dice lo afirmado. En src/app/(app)/calendario/actions.ts:196-205, updateEventFinanceAction solo setea paid_at cuando payment_status pasa a "paid" sin paid_at previo (línea 197). No hay rama que limpie paid_at cuando el estado pasa a pending/partial/none. El patch llega de finance-edit.tsx:54-58 con solo amount_clp, payment_status y document_ty…

### 🟠 [MEDIO] Endpoint notify hace fetch a URL arbitraria del usuario sin validación (SSRF) ni rate-limit · _confirmado_
- **Dónde:** `src/app/api/tracklist/[id]/notify/route.ts:138-143`  · tipo: bug
- **Qué:** El POST hace `fetch(profile.auto_post_webhook_url, ...)` con una URL totalmente controlada por el usuario, sin validar esquema/host ni bloquear destinos internos, y sin throttling. Hay timeout de 10s (bien) pero no hay allowlist ni bloqueo de IPs privadas/localhost/metadata. El endpoint requiere sesión (owner-only, OK), pero un usuario beta puede apuntar el webhook a 169.254.169.254 u hosts internos.
- **Impacto:** SSRF: un DJ (o cuenta comprometida) puede usar el server de DROP como proxy para sondear/pegar a servicios internos de Vercel/red. Severidad acotada porque exige sesión y solo se reenvía el payload de tracklist, pero la respuesta status se devuelve al cliente, lo que permite enumeración básica. Sin rate-limit, también es un disparador de salida sin control.
- **Fix:** Validar que auto_post_webhook_url sea https con host público (rechazar localhost, IPs privadas/link-local, .internal), opcionalmente allowlist de hosts conocidos (make/zapier/n8n), y aplicar un rate-limit por usuario.
- **Verificación:** CONFIRMADO. El código en src/app/api/tracklist/[id]/notify/route.ts:138-143 hace fetch(profile.auto_post_webhook_url, {method:"POST", ...}) con timeout de 10s (AbortController) pero SIN validación de esquema/host ni bloqueo de IPs privadas/link-local/metadata, y devuelve res.status al cliente (línea 147). La URL es 100% controlada por el usuario.

(b) No hay guard que lo mitigue. La única validaci…

### ⚪ [BAJO] sort_order de tracks se calcula con count()+1 (race y colisiones en concurrencia)
- **Dónde:** `src/lib/queries/tracklists.ts:99-108`  · tipo: bug
- **Qué:** addTrack (y bulkInsertTracks en :209-214) calculan el siguiente sort_order con un `count(head:true)` + 1. No hay unique constraint en (tracklist_id, sort_order), así que dos inserts cercanos (doble click en +, o add mientras un reorder está en vuelo) pueden recibir el mismo sort_order.
- **Impacto:** Tracks con sort_order duplicado → orden ambiguo en la lista y en el texto SoundCloud (que numera por sort_order). El usuario ve dos '03.' o un salto. No hay pérdida de datos pero el orden queda inconsistente hasta un reorder manual.
- **Fix:** Derivar el siguiente orden con max(sort_order)+1 en una sola query, o mejor un default a nivel DB / secuencia por tracklist; idealmente recalcular sort_order denso al guardar.

### ⚪ [BAJO] reorderTracksAction hace N updates secuenciales sin chequear error de cada uno
- **Dónde:** `src/app/(app)/calendario/[id]/tracklist/actions.ts:98-105`  · tipo: bug
- **Qué:** El reorder itera `ordered` y hace un `supabase.update(...).eq(...)` por track sin await del {error} de cada uno; si uno falla (o matchea 0 filas por RLS/id ajeno) no se detecta. El UI ya hizo update optimista (tracklist-editor.tsx:225-227).
- **Impacto:** Si un update intermedio falla, el orden en DB queda parcialmente actualizado y distinto del optimista mostrado; tras un refresh el usuario ve un orden mezclado sin ningún mensaje de error.
- **Fix:** Capturar y chequear el {error} de cada update (o hacer un upsert batch), y si alguno falla devolver ok:false para que el editor revierta el optimista.

### ⚪ [BAJO] recomputeTracklistKpis hace UPDATE sin chequear error
- **Dónde:** `src/lib/queries/tracklists.ts:192-200`  · tipo: error
- **Qué:** El update final de total_tracks/bpm_avg/duration_minutes sobre tracklists no captura {error}. Si por RLS o cualquier motivo matchea 0 filas, falla en silencio (gotcha conocido del codebase: UPDATE sin policy = no-op silencioso).
- **Impacto:** Los KPIs persistidos de la tracklist (que usa el webhook/notify y formatSoundCloudDescription en server) pueden quedar desactualizados sin ninguna señal. El editor recalcula KPIs en vivo client-side, así que el usuario no lo nota, pero el payload del webhook (total_tracks/bpm_avg/duration_minutes desde la fila) puede ir viejo.
- **Fix:** Chequear el {error} del update y al menos loguearlo; considerar select de verificación.

### ⚪ [BAJO] listMyEvents traga el error y limita a 200 sin avisar
- **Dónde:** `src/lib/queries/calendar-events.ts:42-46`  · tipo: friccion
- **Qué:** listMyEvents hace `if (error) return []` (traga el error) y aplica `.limit(opts?.limit ?? 200)`. La página /calendario pide ventana -30/+120 días sin limit explícito → tope 200. Un DJ activo con muchos eventos en esa ventana vería la lista cortada silenciosamente, y ante cualquier error de query la página muestra 'Sin eventos aún' como si no hubiera nada.
- **Impacto:** Conteo y lista incompletos en silencio para usuarios con muchos eventos; y un fallo transitorio de Supabase se ve indistinguible de 'no hay eventos', confundiendo al usuario.
- **Fix:** Subir/parametrizar el limit según la ventana real, y diferenciar estado de error de estado vacío (propagar error para mostrar el card de error que ya existe en page.tsx).

### ⚪ [BAJO] confirm() nativo para borrar track y despublicar evento
- **Dónde:** `src/app/(app)/calendario/[id]/tracklist/tracklist-editor.tsx:196`  · tipo: friccion
- **Qué:** handleDelete usa `window.confirm(...)` para borrar un track; lo mismo evento-manager.tsx:100 para despublicar. El resto de la zona ya migró a diálogos in-app (EventEditDialog tiene su propio confirmDelete inline). Queda inconsistente con el sistema de diálogos del proyecto.
- **Impacto:** Popup nativo del navegador rompe la estética y UX consistente; en algunos contextos (iframe/PWA) los confirm nativos se comportan distinto. Fricción menor.
- **Fix:** Reemplazar por el patrón de confirmación inline/dialog ya usado en EventEditDialog.

### ⚪ [BAJO] Editor mezcla estado optimista local con router.refresh(), arriesgando estado desfasado
- **Dónde:** `src/app/(app)/calendario/[id]/tracklist/tracklist-editor.tsx:137-145`  · tipo: friccion
- **Qué:** Tras addTrack/saveEdit/import el editor actualiza `tracks` local (optimista) Y llama router.refresh(), pero no resincroniza `tracks` con los initialTracks del server tras el refresh (el estado useState se inicializa una sola vez). En import, el comentario admite 'sin server-fetch directo, esperamos al refresh server' pero el estado local solo se actualizó vía bulk insert que no devuelve filas; los tracks importados no aparecen en la lista hasta navegar de nuevo.
- **Impacto:** Tras 'Importar N tracks' el mensaje dice 'N importados' pero la tabla puede no mostrarlos hasta recargar la página completa, porque bulkInsertTracks no devuelve las filas y el useState no se rehidrata con el refresh. Confusión: el usuario cree que falló.
- **Fix:** Hacer que bulkImportTracksAction devuelva los tracks insertados y agregarlos al estado local, o re-fetch client-side de la lista tras importar.

---

## Perfil + configuración + suscripción (DJ)

_La capa de perfil/tech-rider está sólida (validación de avatar 10MB con compresión client-side, normalización de URLs, chequeo de {error} en queries, RLS scopeado por user_id). El problema grave vive en el flujo de suscripción/MercadoPago: el webhook /api/mp/webhook NO está en PUBLIC_PATHS, así que el middleware lo redirige a /login y MP nunca llega al handler — toda la sincronización de pagos/estado está rota en prod. Además el handler de preapproval pisa el status sin idempotencia ni control de orden, el webhook devuelve 200 ante errores internos (MP no reintenta), y reactivateSubscriptionAction no chequea su {error}._

### 🔴 [ALTO] El webhook de MercadoPago no es ruta pública → middleware lo redirige a /login (nunca se procesa ningún pago) · _confirmado_
- **Dónde:** `src/lib/supabase/middleware.ts:8-40 (PUBLIC_PATHS) + src/middleware.ts:8-17 (matcher) + src/app/api/mp/webhook/route.ts:66`  · tipo: bug
- **Qué:** El matcher de middleware (src/middleware.ts) hace match de TODO salvo _next/static, _next/image, favicon.ico e imágenes — por lo tanto matchea /api/mp/webhook. En updateSession, isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p)) y /api/mp/webhook NO está en la lista (sí están /api/track, /api/event-rsvp, /api/resend/webhook, etc., pero falta éste). MercadoPago llama sin cookie de sesión, así que user es null y se ejecuta `if (!user && !isPublic && pathname !== '/') return NextResponse.redirect(/login)` (línea 124-128). El POST de MP recibe un 307 hacia /login y el handler POST de route.ts nunca corre.
- **Impacto:** Ningún webhook de MP se procesa en producción: las suscripciones que quedan 'pending' nunca pasan a 'active', los pagos recurrentes mensuales no actualizan current_period_end, los rechazos no marcan past_due y las cancelaciones desde MP no marcan expired. El estado de billing queda permanentemente desincronizado de la realidad. Es la falla más grave de la zona.
- **Fix:** Agregar '/api/mp/webhook' (o '/api/mp/') a PUBLIC_PATHS en src/lib/supabase/middleware.ts, igual que ya se hizo con /api/resend/webhook. La verificación de firma HMAC dentro del route handler sigue protegiendo el endpoint.
- **Verificación:** El hallazgo es REAL. Verifiqué el código exacto citado:

1) src/middleware.ts:15 — el matcher `"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"` solo excluye _next/static, _next/image, favicon.ico e imágenes. `/api/mp/webhook` NO cae en ninguna exclusión → el middleware SÍ corre para esa ruta.

2) src/lib/supabase/middleware.ts:8-40 (PUBLIC_PATHS) — contiene /api…

### 🟠 [MEDIO] El webhook devuelve HTTP 200 ante errores internos del handler → MP no reintenta y se pierden eventos · _confirmado_
- **Dónde:** `src/app/api/mp/webhook/route.ts:97-102`  · tipo: bug
- **Qué:** El catch del dispatcher loguea el error y responde `NextResponse.json({ ok: false, error }, { status: 200 })`. El comentario dice 'devolvemos 200 para que MP no reintente si el error es nuestro', pero un error nuestro transitorio (timeout de getPreapproval/getPayment contra la API de MP — el client tiene timeout 5000ms — o un fallo momentáneo de Supabase) también cae acá y devuelve 200, por lo que MP marca el evento como entregado y NO lo reintenta.
- **Impacto:** Si la API de MP o la DB fallan momentáneamente mientras se procesa un cobro, ese evento se pierde para siempre: la subscription no se actualiza y no hay reintento. Puede dejar a un usuario que pagó sin acceso, o sin registrar el pago en el historial.
- **Fix:** Distinguir errores transitorios (fetch a MP/DB) y devolver 500 para que MP reintente; reservar el 200 solo para casos genuinamente no-reintentar (payload sin match, type ignorado).
- **Verificación:** El código en src/app/api/mp/webhook/route.ts:97-102 dice exactamente lo que afirma el hallazgo: el catch del dispatcher loguea y devuelve NextResponse.json({ ok: false, error }, { status: 200 }) para CUALQUIER excepción de handlePreapproval/handlePayment, con el comentario "Devolvemos 200 igual para que MP no nos siga reintentando". No distingue error transitorio de no-reintentar.

(a) Confirmado …

### ⚪ [BAJO] reactivateSubscriptionAction no chequea el {error} del update de Supabase (posible no-op silencioso) · _confirmado_
- **Dónde:** `src/app/suscripcion/actions.ts:217-227`  · tipo: bug
- **Qué:** El update final (`admin.from('subscriptions').update({ cancel_at_period_end:false, cancelled_at:null, cancellation_reason:null })`) descarta el resultado: no captura `{ error }` como sí hacen cancelSubscriptionAction (línea 166-176) y subscribeAction (línea 94-111). Si el update falla (RLS no aplica acá porque es admin client, pero un fallo de red/constraint sí), la action devuelve {ok:true} igual y ReactivateSubscriptionButton redirige a /suscripcion como si hubiera funcionado.
- **Impacto:** Una falla del update se traga en silencio y el usuario cree que reactivó cuando los flags quedaron sin tocar. Inconsistente con el resto del módulo que sí valida.
- **Fix:** Capturar `const { error } = await admin...update(...)` y devolver `{ ok:false, error }` si falla, igual que cancelSubscriptionAction.
- **Verificación:** El defecto de código es REAL y verificado. En src/app/suscripcion/actions.ts:217-224 el update final descarta el resultado: `await admin.from("subscriptions").update({ cancel_at_period_end:false, cancelled_at:null, cancellation_reason:null }).eq("id", s.id)` — NO captura `{ error }`, a diferencia de subscribeAction (línea 94: `const { error: updErr }`) y cancelSubscriptionAction (línea 166: `const…

### ⚪ [BAJO] updateAvailabilityAction y updateAutoPostAction no llaman assertBetaActive() — inconsistente con saveProfileAction
- **Dónde:** `src/app/(app)/configuracion/actions.ts:79-96 (updateAvailability) y 173-185 (updateAutoPost)`  · tipo: friccion
- **Qué:** saveProfileAction (línea 26), addRiderItemAction (línea 106) y el comentario del módulo establecen que con beta vencida la cuenta queda congelada y no se puede editar nada. Pero updateAvailabilityAction y updateAutoPostAction llaman updateMyProfile directo sin assertBetaActive(), por lo que un usuario con beta/suscripción vencida todavía puede cambiar su visibilidad en /dj, su disponibilidad (que dispara emails a bookers según availability-section.tsx:201-206) y su webhook de auto-post.
- **Impacto:** El 'congelamiento' por cuenta vencida es inconsistente: campos clave del marketplace siguen editables y la publicación de disponibilidad podría seguir notificando a bookers desde una cuenta que no debería poder operar.
- **Fix:** Agregar `await assertBetaActive()` al inicio de updateAvailabilityAction y updateAutoPostAction, o documentar explícitamente por qué estos quedan exentos.

### ⚪ [BAJO] Voseo argentino 'Agregalo' en mensaje de error del cliente MP
- **Dónde:** `src/lib/mercadopago/client.ts:28`  · tipo: friccion
- **Qué:** El throw de getAccessToken usa 'Agregalo en .env.local...' (imperativo voseo). El estándar del proyecto es tuteo chileno: debería ser 'Agrégalo'. Es un mensaje técnico de configuración (no llega normalmente al usuario final), de ahí severidad baja, pero rompe la convención de copy.
- **Impacto:** Inconsistencia con la regla de tuteo chileno del proyecto. Visible solo en logs/errores de entorno mal configurado.
- **Fix:** Cambiar 'Agregalo' por 'Agrégalo'.

### ⚪ [BAJO] Estado 'pending' otorga acceso indefinido si el webhook no resuelve (agravado por el bug del middleware)
- **Dónde:** `src/lib/queries/subscription.ts:125-134 + src/app/suscripcion/actions.ts:91-92`  · tipo: bug
- **Qué:** subscribeAction setea status='pending' cuando MP no devuelve 'authorized' de inmediato (línea 91-92), y evaluateSubscriptionAccess trata 'pending' como hasAccess:true sin límite de tiempo (línea 125-134, reason='active'). La transición pending→active|past_due depende exclusivamente del webhook. Con el webhook caído (finding mp-webhook-no-public-path), un usuario cuyo cobro nunca se confirma o se rechaza queda con acceso 'pending' permanente; o, si se arregla el webhook, igual no hay timeout local que reevalúe un pending viejo.
- **Impacto:** Usuarios con pago no confirmado/rechazado pueden conservar acceso indefinidamente porque nada local caduca el estado 'pending'. Riesgo de ingresos: acceso sin pago efectivo.
- **Fix:** Acotar 'pending': guardar un timestamp y, pasado un umbral (ej. 24-48h) sin confirmación, tratarlo como sin acceso o reconsultar getPreapproval; no depender solo del webhook.

---

## Growth + campañas + plantillas

_La zona está mayormente sana en CRUD y RLS de lectura (todo scoping por user_id, errores de insert/update sí se chequean). Los problemas reales se concentran en: (1) el sync de métricas no tiene dedup/idempotencia y rompe el cálculo de delta cuando corre 2 veces el mismo día; (2) varios DELETE de Supabase ignoran {error} → no-op silencioso si falta policy RLS; (3) la UI dice "últimos 30d" pero el delta compara los 2 snapshots más recientes (cualquier fecha). Más fricciones menores (voseo, alerts nativos, race en toggle optimista del board)._

### 🟠 [MEDIO] El sync de plataformas no es idempotente: corridas múltiples el mismo día duplican snapshots y rompen el delta · _confirmado_
- **Dónde:** `src/lib/integrations/sync-job.ts:77-89`  · tipo: bug
- **Qué:** syncOneAccount() hace siempre un .insert() nuevo en platform_snapshots sin ninguna verificación de 'ya hay snapshot auto hoy'. La ruta cron (src/app/api/growth/sync-cron/route.ts:46-48) además expone GET=POST, y el usuario también puede gatillar syncNowAction() (configuracion/platform-accounts-actions.ts:82) cuantas veces quiera. No existe constraint de unicidad por (user_id, platform, día) ni un upsert. Cada disparo apila otra fila auto del mismo día.
- **Impacto:** Si el cron reintenta (GitHub Actions retry) o Jaime pulsa 'Sincronizar ahora' después de que ya corrió el cron, se crean 2+ snapshots con followers casi idénticos del mismo día. getGrowthDeltas() compara snapshots[0] vs snapshots[1] (los dos más recientes), así que el delta del dashboard pasa a ser ~0 (dos lecturas del mismo día) en vez de mostrar el crecimiento real vs el día/semana anterior. La cifra 'X SEGUIDORES' del hero queda falseada.
- **Fix:** Antes de insertar en syncOneAccount, buscar si ya existe un snapshot source='auto' para ese user_id+platform en el día (America/Santiago) y hacer update en lugar de insert (o un upsert con constraint único por user_id+platform+fecha). Alternativamente, deduplicar en getGrowthDeltas tomando el último snapshot por día calendario antes de calcular el delta.
- **Verificación:** El bug es REAL y no está mitigado. syncOneAccount (src/lib/integrations/sync-job.ts:78-89) hace un .insert() crudo en platform_snapshots con source='auto' sin ningún chequeo de "ya hay snapshot auto hoy", sin upsert ni onConflict. No existe constraint de unicidad por día: el schema (0010 líneas 157-181, 0011 líneas 74-79) solo crea un ÍNDICE en (user_id, platform, snapshot_at desc); el unique(user…

### ⚪ [BAJO] El delta del dashboard se rotula '30d / desde tu última actualización' pero compara los 2 snapshots más recientes (cualquier fecha) · _confirmado_
- **Dónde:** `src/lib/queries/growth.ts:409-417`  · tipo: bug
- **Qué:** getGrowthDeltas() arma por plataforma snapshots[] ordenados desc y calcula delta = snapshots[0].followers - snapshots[1].followers, es decir el snapshot actual vs el inmediatamente anterior, sin importar si ese anterior fue ayer o hace 6 meses. La página lo presenta como ventana temporal: el comentario en src/app/(app)/growth/page.tsx:53-54 dice 'delta total de seguidores en los últimos 30d' y el hero (page.tsx:73) titula '— GROWTH · DESDE TU ÚLTIMA ACTUALIZACIÓN'.
- **Impacto:** El número y el % de crecimiento que ve Jaime no corresponden a ninguna ventana fija: dependen de cuándo cargó el snapshot anterior. Dos snapshots cargados con minutos de diferencia muestran delta minúsculo; uno cargado tras 3 meses muestra el salto de 3 meses etiquetado como si fuera reciente. Decisiones de growth sobre dato engañoso.
- **Fix:** Definir la semántica real: o (a) comparar contra el snapshot más cercano a hace 30 días (filtrar por snapshot_at >= now-30d en zona Chile y tomar el más antiguo dentro de la ventana), o (b) cambiar el copy del hero y el comentario para que digan 'vs tu snapshot anterior' sin prometer 30 días.
- **Verificación:** El MECANISMO es real: getGrowthDeltas() (src/lib/queries/growth.ts:394-433) hace .order("snapshot_at", desc) SIN filtro de ventana (no hay .gte snapshot_at >= now-30d), agrupa por plataforma y calcula delta = snapshots[0].followers - snapshots[1].followers (líneas 410-417). Es literalmente "actual vs snapshot inmediatamente anterior, de cualquier fecha". El propio docstring (390-393) lo admite: "e…

### ⚪ [BAJO] deleteGrowthCampaign / deleteContentPost / deleteSnapshot ignoran {error} → borrado puede ser no-op silencioso · _incierto_
- **Dónde:** `src/lib/queries/growth.ts:206-213`  · tipo: bug
- **Qué:** deleteGrowthCampaign (206), deleteContentPost (301-308) y deleteSnapshot (369-376) hacen await supabase...delete().eq(...).eq(...) sin desestructurar ni revisar {error}, y devuelven void. Por el gotcha documentado de RLS, un DELETE sin policy correspondiente devuelve 0 filas sin lanzar error. La acción que llama (growth/actions.ts:66 deleteGrowthCampaignAction) hace redirect('/growth/ads') como si hubiera funcionado, y deleteSnapshotAction/deleteContentPostAction devuelven {ok:true}.
- **Impacto:** Si la policy DELETE de growth_campaigns/content_posts/platform_snapshots faltara o cambiara, el usuario ve 'borrado OK' (redirige/refresca) pero la fila sigue ahí; reaparece al recargar. Falla muda imposible de diagnosticar desde la UI. Contrasta con deleteTemplate (templates.ts:78-86) que SÍ chequea el error — inconsistencia que delata el descuido.
- **Fix:** Desestructurar { error } en los tres deletes y throw new Error(error.message) cuando exista, igual que ya hace deleteTemplate.
- **Verificación:** El hecho del código es exacto: en src/lib/queries/growth.ts, deleteGrowthCampaign (206-213), deleteContentPost (301-308) y deleteSnapshot (369-376) hacen `await supabase.from(...).delete().eq("user_id", user.id).eq("id", id)` sin desestructurar ni revisar {error}, devolviendo void. El contraste con deleteTemplate (templates.ts:80-85) que sí hace `const { error } = ...; if (error) throw new Error(e…

### ⚪ [BAJO] Las escrituras a platform_accounts (sync result y updateAccountSyncResult) no chequean {error} · _confirmado_
- **Dónde:** `src/lib/integrations/sync-job.ts:92-101`  · tipo: bug
- **Qué:** En syncOneAccount, el .update() de platform_accounts con last_synced_at/last_followers/last_error (92-101) y el update del catch (114-120) no revisan {error}. Igual en updateAccountSyncResult (platform-accounts.ts:81-92). El insert del snapshot SÍ se chequea (línea 89), pero el reflejo de estado en platform_accounts no.
- **Impacto:** Si el update de platform_accounts falla (policy, columna), last_error/last_followers/last_synced_at quedan desactualizados sin que nadie se entere: la sección de Configuración mostrará 'Última sync' vieja o no mostrará el error real que ocurrió, y el delta del sync-job (acc.last_followers) se calcula sobre un valor obsoleto.
- **Fix:** Desestructurar { error } en los updates de platform_accounts y al menos loguearlo (o propagarlo en el AccountResult).
- **Verificación:** El código existe y dice lo que el hallazgo afirma, pero la severidad está sobreestimada y una de las dos ubicaciones es código muerto.

(a) Verificado: en /Users/jayportu/Desktop/jayportu_Manager_OS/src/lib/integrations/sync-job.ts las dos llamadas .update() a platform_accounts NO desestructuran {error}: el update de éxito (92-101: last_synced_at/last_followers/last_track_count/external_id/last_er…

### ⚪ [BAJO] Voseo argentino en el hero de Posts ('Planeá qué postear')
- **Dónde:** `src/app/(app)/growth/posts/page.tsx:59`  · tipo: friccion
- **Qué:** El subtítulo del hero dice 'Planeá qué postear y cuándo.' — 'Planeá' es imperativo voseo (Argentina). El resto de la zona usa tuteo chileno correcto ('Pon los valores', 'Selecciona al menos', 'Crea una campaña').
- **Impacto:** Rompe la voz de marca (tuteo chileno obligatorio según guía de tono DROP.). Suena argentino y desentona con el resto del producto.
- **Fix:** Cambiar a tuteo chileno: 'Planea qué postear y cuándo.'

### ⚪ [BAJO] El board de posts hace router.refresh() en cada drop pero no limpia el estado optimista → flicker/stale en arrastres rápidos
- **Dónde:** `src/app/(app)/growth/posts/posts-board.tsx:79-91`  · tipo: friccion
- **Qué:** onDrop setea optimistic.set(postId, newStatus) y, si ok, hace router.refresh() pero NUNCA limpia ese map en caso de éxito. El optimistic queda como capa permanente sobre los posts del server (effectiveStatus prioriza el optimistic). Si llegan props nuevas tras el refresh con el status ya actualizado, el optimistic sigue ahí; en arrastres encadenados de la misma tarjeta antes de que termine el refresh, el estado mostrado puede divergir del server hasta el próximo render completo.
- **Impacto:** En uso normal (un drop, esperar) no se nota, pero al mover varias tarjetas rápido puede verse parpadeo o una tarjeta en columna equivocada momentáneamente. Memoria del map crece con cada drop de la sesión.
- **Fix:** En la rama ok, tras router.refresh() borrar la entrada del optimistic para ese postId (como ya se hace en el revert), de modo que la fuente de verdad vuelva a ser el prop del server.

### ⚪ [BAJO] Uso de alert()/confirm() nativos para errores y confirmaciones de borrado en la zona
- **Dónde:** `src/app/(app)/campanas/[id]/contact-row.tsx:101`  · tipo: friccion
- **Qué:** contact-row.tsx usa confirm() (101) y alert() (110,127,150); posts-board.tsx alert() (87); add-contacts-dialog.tsx alert() (92); seed-button.tsx alert() (20); campaign-actions.tsx y actions-bar.tsx usan confirm() para borrar. El repo ya migró a un sistema de diálogos unificado en /admin (ver tarea #9 'Sistema de diálogos que reemplaza popups nativos'), pero esta zona sigue con popups del navegador.
- **Impacto:** Inconsistencia de UX respecto al resto del producto ya migrado; los alert/confirm nativos no se pueden estilar, bloquean el hilo y se ven fuera de lugar con el diseño brutalist. Fricción menor, no funcional.
- **Fix:** Reemplazar por el sistema de diálogos/confirmación ya existente en el proyecto, igual que se hizo en /admin.

### ⚪ [BAJO] toLocalInput en el form de posts convierte fechas con el offset del navegador, no con America/Santiago
- **Dónde:** `src/app/(app)/growth/posts/post-form.tsx:40-45`  · tipo: bug
- **Qué:** toLocalInput() hace d.setMinutes(d.getMinutes() - d.getTimezoneOffset()) para poblar el <input type='datetime-local'> y al guardar usa new Date(plannedAt).toISOString(). Toda la conversión depende de la zona horaria del navegador del usuario, no de Chile fija. Para Jaime navegando desde Chile coincide, pero el dato planned_at/published_at se interpreta según la TZ local del cliente.
- **Impacto:** Si el post se edita desde un navegador en otra zona horaria (viaje, VPN, o futuro usuario fuera de Chile), planned_at/published_at se desplazan respecto a lo mostrado. Hoy de bajo impacto porque el único usuario está en Chile, pero es una bomba de relojería si se amplía.
- **Fix:** Si la app es estrictamente hora de Chile, convertir explícitamente a/desde America/Santiago en lugar de confiar en getTimezoneOffset() del navegador (usar un helper de tz consistente con el resto del codebase).

---

## Gmail + descubrir + IA + lugares

_La zona está mayormente sana en seguridad (OAuth con state CSRF, callback verifica sesión adentro, overpass con auth+rate-limit, RLS completa en gmail_connections/threads_cache, balance de tokens con tz Chile correcta). Los hallazgos reales: la página /ia (Strategy Mode) quedó huérfana — no está en ningún nav (sidebar ni mobile) y la IA local Ollama es inútil para users; el callback de Gmail puede pisar el refresh_token con "" al reconectar; la página de hilo crashea con hilos de 0 mensajes; y hay varios silent-failures por {error} no chequeado y fricciones de copy (voseo argentino) y UX._

### 🟠 [MEDIO] La página /ia (Strategy Mode) no está en ningún menú — feature muerta para el usuario · _confirmado_
- **Dónde:** `src/components/layout/sidebar.tsx:41-53 y src/components/layout/mobile-menu.tsx:48-59`  · tipo: bug
- **Qué:** NAV_ITEMS en sidebar.tsx (líneas 41-53) y mobile-menu.tsx (líneas 48-59) NO incluyen ninguna entrada hacia '/ia'. La página existe y funciona (src/app/(app)/ia/page.tsx + strategy-mode.tsx), pero no hay forma de llegar a ella desde la navegación: no aparece en el sidebar desktop, ni en el drawer mobile, ni en el dashboard (dashboard/page.tsx lista Growth/Gmail/Press kit pero no IA). Además robots.ts:32 la marca disallow. Solo es accesible escribiendo /ia a mano en la URL.
- **Impacto:** El usuario nunca descubre el modo estrategia con ChatGPT. Toda la feature (prompt builder + guardar respuesta como nota) es trabajo invisible. Coincide con la nota del foco: 'la IA quedó muerta en el nav'.
- **Fix:** Decidir: (a) si la feature sigue viva, agregar { href: '/ia', label: 'IA', icon: Sparkles } a NAV_ITEMS en sidebar.tsx y mobile-menu.tsx; o (b) si se deprecó (Ollama local inútil para users, y esto es ChatGPT manual), borrar la ruta /ia entera para no dejar código zombie. No dejarla a medias.
- **Verificación:** El hallazgo es real. Verifiqué los NAV_ITEMS en ambos archivos citados: sidebar.tsx:41-53 (Dashboard, CRM, Descubrir, Lugares, Campañas, Calendario, Press kit, Plantillas, Gmail, Growth, Configuración) y mobile-menu.tsx:48-59 (mismo set sin Lugares) NO contienen ninguna entrada hacia /ia. Un grep de todo src/ por "/ia" en .tsx/.ts devuelve UNA sola coincidencia: src/app/robots.ts:32 (el disallow).…

### 🟠 [MEDIO] La página de detalle de hilo crashea si el hilo tiene messages=[] (array vacío) · _confirmado_
- **Dónde:** `src/app/(app)/gmail/[threadId]/page.tsx:49 y :66`  · tipo: bug
- **Qué:** El guard de la línea 49 es 'if (!thread || !thread.messages)'. Un array vacío [] es truthy, así que pasa el guard. Luego la línea 66 hace 'extractMessageMeta(thread.messages[0])' con thread.messages[0] === undefined; dentro de extractMessageMeta (client.ts:229) accede a 'msg.payload?.headers' sobre undefined → TypeError 'Cannot read properties of undefined'. La página revienta (error boundary) en vez de mostrar el estado 'Hilo vacío' que sí existe abajo.
- **Impacto:** Cualquier threadId que Gmail devuelva sin mensajes (raro pero posible: hilo recién borrado, permisos) tumba la página entera con error de runtime en vez de degradar.
- **Fix:** Cambiar el guard a 'if (!thread || !thread.messages || thread.messages.length === 0)' para que caiga en el render de 'Hilo vacío'.
- **Verificación:** El código dice exactamente lo que afirma el hallazgo. En src/app/(app)/gmail/[threadId]/page.tsx:49 el guard es `if (!thread || !thread.messages)`. Un array vacío [] es truthy, así que `!thread.messages` da false y el guard se pasa de largo. En :66 se hace `extractMessageMeta(thread.messages[0])`, y `[][0]` === undefined. Dentro de extractMessageMeta (src/lib/gmail/client.ts:229) la primera línea …

### ⚪ [BAJO] El callback de Gmail sobrescribe el refresh_token con cadena vacía al reconectar · _incierto_
- **Dónde:** `src/app/api/gmail/callback/route.ts:69`  · tipo: bug
- **Qué:** En el upsert a gmail_connections se hace 'refresh_token: tokens.refresh_token || ""'. Google solo devuelve refresh_token en el PRIMER consent o cuando se fuerza prompt=consent. Aunque oauth.ts usa prompt='consent' (mitigación), Google puede omitir el refresh_token en re-consents (p.ej. cuando ya hay varios grants activos o por políticas de la cuenta). Si eso pasa, el upsert pisa el refresh_token bueno guardado con "", y a futuro refreshAccessToken("") (client.ts:47) falla con 'Refresh falló: 400' y la conexión queda muerta sin aviso.
- **Impacto:** Una reconexión 'inocente' puede dejar al DJ con Gmail conectado en apariencia pero incapaz de refrescar token → al expirar el access_token (1h), todo Gmail tira error y hay que desconectar+reconectar a ciegas.
- **Fix:** No pisar el refresh_token si Google no lo devuelve: hacer update condicional. Si tokens.refresh_token está presente, escribirlo; si no, omitir esa columna del upsert (o leer el existente y reusarlo). Ej: construir el objeto sin refresh_token y solo añadirlo cuando tokens.refresh_token sea truthy.
- **Verificación:** El código cita correcto: src/app/api/gmail/callback/route.ts:69 dice literalmente `refresh_token: tokens.refresh_token || ""`. El upsert (línea 65) NO pasa `onConflict`, pero `user_id` es PRIMARY KEY de gmail_connections (supabase/migrations/0006_gmail.sql:10), así que en reconexión el `ON CONFLICT (user_id) DO UPDATE` de Postgres reescribe todas las columnas provistas, incluido refresh_token. La …

### ⚪ [BAJO] Voseo argentino en placeholder del form de pitch ('Quién sos') · _confirmado_
- **Dónde:** `src/app/(app)/lugares/venue-card.tsx:128`  · tipo: friccion
- **Qué:** El placeholder del textarea de pitch dice 'Quién sos, tu sonido, por qué encajas en este lugar…'. 'sos' es voseo argentino. El estándar del producto es tuteo chileno ('Quién eres').
- **Impacto:** Rompe la voz de marca chilena en una pantalla de cara al DJ (memoria 'Tono DROP.' lo marca como regla dura).
- **Fix:** Cambiar a 'Quién eres, tu sonido, por qué encajas en este lugar…'.
- **Verificación:** El código en src/app/(app)/lugares/venue-card.tsx:128 dice EXACTAMENTE placeholder="Quién sos, tu sonido, por qué encajas en este lugar…". "Quién sos" es voseo argentino real ("sos" = forma voseo del verbo ser); el tuteo chileno sería "Quién eres". El string es un literal hardcodeado directo en el atributo placeholder del <textarea> del form de pitch (líneas 123-130) — no hay capa i18n, mapeo de c…

### ⚪ [BAJO] Voseo en ejemplo de manual paste / verificar copy de pitch refund
- **Dónde:** `src/app/(app)/descubrir/discover-tabs.tsx:128-141 (revisar) y venue-card.tsx:140`  · tipo: friccion
- **Qué:** Revisión de copy general de la zona: el resto del copy revisado usa tuteo correcto. El único voseo confirmado es venue-card.tsx:128 (ya reportado aparte). Dejo este hallazgo como recordatorio de bajo nivel para QA de copy en los textos del form de pitch (venue-card.tsx:140 'se devuelve si no lo ven en 14 días' está OK en tuteo/impersonal). No hay otro voseo confirmado en discover-tabs.
- **Impacto:** Menor; sin voseo adicional confirmado más allá del ya reportado.
- **Fix:** Pasar un linter de voseo (sos/tenés/elegí/queres) por toda la zona; corregir solo venue-card.tsx:128.

### ⚪ [BAJO] upsertThreadCache y associateThreadToContact no chequean {error} (fallo mudo)
- **Dónde:** `src/lib/queries/gmail.ts:59-75 y :83-88`  · tipo: bug
- **Qué:** Ambas funciones hacen 'await supabase.from(...).upsert/update(...)' sin desestructurar ni revisar {error}. La RLS de gmail_threads_cache SÍ tiene policies insert/update own (migración 0006:89-96) y la tabla tiene unique(user_id,thread_id), así que para el dueño no es no-op silencioso por RLS. Pero un error de red, de constraint, o de tipo se traga sin avisar: associateAction (actions.ts) reporta {ok:true} aunque el guardado falle, y la UI muestra 'Guardado ✓' falsamente.
- **Impacto:** El usuario asocia un hilo a un contacto, ve 'Guardado', pero si hubo error transitorio el cambio no se persiste y no se entera. Bajo porque el camino feliz funciona y la RLS está bien.
- **Fix:** Desestructurar { error } en ambas y throw new Error(error.message) si existe, igual que ya hace discovered-leads.ts. Así associateAction devuelve {ok:false} y la UI muestra el error real.

### ⚪ [BAJO] Uso de alert()/confirm() nativos en lead-actions, strategy-mode y associate-contact
- **Dónde:** `src/app/(app)/descubrir/lead-actions.tsx:40,51,62,58; src/app/(app)/ia/strategy-mode.tsx:144; src/app/(app)/gmail/[threadId]/associate-contact.tsx:59`  · tipo: friccion
- **Qué:** lead-actions.tsx usa alert(`Error: ...`) en handlePromote/handleDismiss/handleDelete y confirm('¿Borrar este lead?') (líneas 40, 51, 58, 62); strategy-mode.tsx:144 usa alert(`Error: ...`); associate-contact.tsx:59 usa alert(result.error). El resto del producto ya migró a un sistema de diálogos propio (tarea #9 'Sistema de diálogos (reemplaza popups nativos)').
- **Impacto:** Inconsistencia de UX: estas pantallas muestran popups nativos del browser (feos, bloqueantes, no theme-aware) mientras el resto del admin usa diálogos unificados.
- **Fix:** Reemplazar alert()/confirm() por el sistema de diálogos/toasts del proyecto (el usado en el refactor admin de la tarea #9/#11).

### ⚪ [BAJO] POST /api/gmail/disconnect no valida CSRF ni method-origin
- **Dónde:** `src/app/api/gmail/disconnect/route.ts:13-26`  · tipo: bug
- **Qué:** El endpoint POST borra la conexión Gmail del usuario apoyándose solo en la cookie de sesión (deleteGmailConnection usa getUserOrThrow). No hay token CSRF ni verificación de Origin/Referer. Un sitio malicioso podría auto-postear un form a /api/gmail/disconnect y, con la cookie de sesión presente (sameSite por defecto Lax permite POST top-level navigations en algunos casos), forzar la desconexión.
- **Impacto:** Bajo: el peor caso es desconectar Gmail (no borra datos del CRM, recuperable reconectando). SameSite=Lax en cookies de Supabase mitiga la mayoría de vectores. Aun así es un POST que muta estado sin protección CSRF.
- **Fix:** Verificar header Origin contra el host esperado en el route, o emitir/validar un token CSRF en el form de disconnect-form.tsx. Defense-in-depth; Cloudflare delante ayuda pero no cubre CSRF.

### ⚪ [BAJO] Comentarios y tipos siguen referenciando Ollama como destino vivo de IA
- **Dónde:** `src/lib/queries/ai-outputs.ts:5 (source: 'ollama'), src/app/(app)/descubrir/actions.ts:178 ('pasar a IA local Ollama'), src/lib/ai/prompts.ts:2`  · tipo: friccion
- **Qué:** ai-outputs.ts:5 mantiene 'ollama' como source válido; descubrir/actions.ts:178 dice en comentario 'En sprint futuro: pasar a IA local Ollama para parsing más inteligente'; prompts.ts:2 'Prompts reutilizables para Ollama y para ChatGPT'. Según memoria del proyecto (ia_ollama_deprecated_drop), Ollama solo corre en el Mac de Jaime = inútil para users y la IA salió del nav. Estas referencias son código/planes muertos.
- **Impacto:** Deuda de claridad: futuros lectores creen que hay (o habrá) integración Ollama servible para usuarios. No es un bug funcional.
- **Fix:** Limpiar comentarios que prometen Ollama como camino futuro para users y, si /ia se conserva como ChatGPT-manual, ajustar el copy/tipos para reflejar que la única IA real es el flujo manual de ChatGPT.

---

## Lado booker (buscar, Smart Match, favoritos/seguidos, requests, pitches, /b/[token], perfil)

_La zona está bastante sana: el flujo crítico (RLS con admin client donde dj_profile es owner-only, gating server-side de texto libre Founding, backfill por email gateado tras sesión confirmada, copy 100% tuteo chileno sin voseo) está bien resuelto y comentado. Los hallazgos son sobre todo hardening: una server action pública tokenizada (contraoferta) sin rate-limit ni cap de longitud en el mensaje, un bug de timezone en el cálculo de disponibilidad, N+1 de requests al montar grillas, falta del guard isSupabaseStorageUrl en 3 páginas con next/image, errores de Supabase no chequeados en marcadores de "visto/leído", y código muerto._

### 🟠 [MEDIO] Disponibilidad 'hoy' se calcula en UTC, no en hora de Chile · _confirmado_
- **Dónde:** `src/lib/queries/directory.ts:80`  · tipo: bug
- **Qué:** `calcIsAvailable` hace `const date = checkDate ?? new Date().toISOString().slice(0, 10)` → toma la fecha del server en UTC. Vercel corre en UTC; entre ~20:00 y 23:59 de Chile (UTC-4 en invierno) la fecha UTC ya es el día siguiente. Existe el helper santiagoMonthStartUtcISO/santiagoToUtcISO en src/lib/tz.ts justamente para esto, pero acá no se usa un 'today en Santiago'.
- **Impacto:** El filtro 'Solo disponibles' de /booker/buscar, el badge '★ N disponibles ahora' y el is_available_now de las cards pueden estar corridos un día cerca de la medianoche chilena: un DJ disponible solo 'hoy' desaparece antes de tiempo, o uno cuyo available_from es 'mañana' aparece antes. Mismo desfase afecta el badge 'Disponible el {fecha}' del Smart Match cuando no se pasa eventDate.
- **Fix:** Calcular el 'today' en America/Santiago (ej. `new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago'}).format(new Date())` que ya da YYYY-MM-DD) y pasarlo como checkDate en listPublicDjs/getDropPicks, o agregar un helper todayInChile() en tz.ts.
- **Verificación:** CONFIRMADO. En src/lib/queries/directory.ts:80 calcIsAvailable hace `const date = checkDate ?? new Date().toISOString().slice(0, 10)` y el propio comentario (línea 79) lo admite: "Default: hoy (UTC)". listPublicDjs (línea 164) y getDropPicks (línea 232) lo llaman SIN checkDate, o sea usan el today UTC. Esos resultados alimentan directamente: el filtro onlyAvailable de /booker/buscar (directory.ts:…

### 🟠 [MEDIO] Cada card de /buscar y /match dispara un fetch individual a /api/booker/favorite-state · _confirmado_
- **Dónde:** `src/components/booker/favorite-button-client.tsx:48-77 (montado por buscar-card.tsx:98 y match-card.tsx:72)`  · tipo: friccion
- **Qué:** FavoriteButtonClient hace en su useEffect un `fetch('/api/booker/favorite-state?dj=...')` por instancia. En /booker/buscar la grilla renderiza hasta 200 cards (listPublicDjs slice 200) y en /match hasta 15, cada una con su propio corazón → N requests al endpoint force-dynamic al montar la página. Cada request además re-consulta auth.getUser() + dj_profile + booker_favorites.
- **Impacto:** Ráfaga de N llamadas a la API en cada carga del buscador (peor en mobile / conexiones lentas), latencia visible para que aparezcan los corazones, y carga innecesaria sobre Supabase. En /booker/* el usuario YA está logueado y se sabe que es booker, así que el estado podría resolverse en el server render.
- **Fix:** En /booker/buscar y /booker/match (ya son server components con sesión booker garantizada por el layout) traer el set de favoritos del booker una sola vez y pasar `favorited`/`canFavorite` como props iniciales a las cards, evitando el fetch por card. Dejar el fetch-on-mount solo para superficies cacheadas estáticas (/p/[slug], /dj).
- **Verificación:** El hallazgo es real, aunque dos rutas de archivo citadas están mal.

(a) Código confirmado:
- src/components/booker/favorite-button-client.tsx:48-77 — el useEffect hace `fetch('/api/booker/favorite-state?dj=...', {cache:"no-store"})` POR instancia, exactamente como se describe. Path y líneas correctos.
- Las cards montan ese botón: PERO viven en src/app/booker/buscar/buscar-card.tsx:98 y src/app/b…

### ⚪ [BAJO] Contraoferta pública (token) sin rate-limit ni cap de longitud en el mensaje · _confirmado_
- **Dónde:** `src/app/b/[token]/actions.ts:80 (y todo submitCounterofferAction:24-128)`  · tipo: bug
- **Qué:** submitCounterofferAction es una server action accesible sin login (la ruta /b/ está en PUBLIC_PATHS) que escribe en booking_form_submissions vía admin client (service_role, salta RLS). No tiene rate-limit. Y `counter_message` se guarda como `(message ?? '').trim()` SIN .slice() — el cap de 500 chars es solo `maxLength` del <textarea> en el cliente, pero la action es invocable directamente (fetch al endpoint de la action) con un payload arbitrario. Comparar con sendPitchAction (`.slice(0,600)`) y updateBookerProfileAction (`.slice(0,600)`) que sí capean server-side.
- **Impacto:** Cualquiera que conozca/adivine un view_token puede contraofertar sin cuenta (el propio comentario del código lo admite). Sin cap de longitud, puede inyectar un counter_message gigante (DoS de almacenamiento / romper el render del dashboard del DJ). Sin rate-limit, puede spamear el endpoint. El status pasa a 'contraofertado' y dispara push + insert en presskit_events del DJ por cada hit.
- **Fix:** Capear server-side: `counter_message: (message ?? '').trim().slice(0, 500)`. Añadir rate-limit por token/IP a la action (igual que otros endpoints públicos). Considerar validar que el token tenga el formato esperado (UUID/longitud mínima) antes de pegarle a la DB.
- **Verificación:** El hallazgo es REAL en su núcleo pero está MUY sobredimensionado. Verifiqué línea por línea.

CONFIRMADO (defecto concreto): src/app/b/[token]/actions.ts:80 guarda `counter_message: (message ?? "").trim()` SIN `.slice()`. El cap de 500 sí es solo client-side (counteroffer-form.tsx:136 `maxLength={500}`). La asimetría con los hermanos es real y la verifiqué: src/app/(app)/lugares/actions.ts:73 `mes…

### ⚪ [BAJO] next/image sin guard isSupabaseStorageUrl en pitches, interesados y seguidos · _confirmado_
- **Dónde:** `src/app/booker/pitches/page.tsx:64-70; src/app/booker/interesados/page.tsx:66-72; src/app/booker/seguidos/page.tsx:117-123 y 186-191`  · tipo: friccion
- **Qué:** Estas páginas pasan `p.avatar_url` / `dj.avatar_url` / `dj.hero_image_url` / `update.avatar_url` directo a <Image src=...>. next.config solo permite remotePatterns hostname '*.supabase.co'. Las cards de /buscar y /match SÍ se protegen con `isSupabaseStorageUrl(...) ?? ''` (buscar-card.tsx:53, match-card.tsx:22) precisamente porque una URL de otro host revienta el render en runtime. Acá ese guard falta.
- **Impacto:** Si cualquier dj_profile tiene un avatar_url/hero_image_url que no es de Supabase Storage (dato legacy, importado, o seteado a mano), <Image> lanza en runtime y tumba toda la página del booker (pitches/interesados/seguidos) en vez de caer al placeholder. Hoy los avatares vienen de uploads controlados, así que la probabilidad es baja, pero la inconsistencia con el patrón defensivo del propio codebase la hace frágil.
- **Fix:** Aplicar el mismo guard que las otras cards: condicionar el <Image> a isSupabaseStorageUrl(url) y caer al placeholder de iniciales cuando no aplique, en las 4 ubicaciones.
- **Verificación:** El código dice lo que afirma el hallazgo. Las 4 ubicaciones pasan URLs de la DB directo a <Image src> sin guard: src/app/booker/pitches/page.tsx:63-70 (p.avatar_url), src/app/booker/interesados/page.tsx:65-72 (dj.avatar_url; el cite "66-72" está corrido 1 línea pero es la misma card), src/app/booker/seguidos/page.tsx:115-124 (dj.hero_image_url) y 185-192 (update.avatar_url). El patrón defensivo SÍ…

### ⚪ [BAJO] UPDATEs de 'visto'/'leído' no chequean {error} (fallo mudo)
- **Dónde:** `src/lib/queries/booker.ts:463-468 (markReceivedPitchesViewed), 781-785 (markFollowFeedRead); src/app/booker/actions.ts:75-81 (markPitchViewedAction)`  · tipo: bug
- **Qué:** Los tres updates a venue_pitches.viewed_at / booker_favorites.last_read_at se hacen con `await supabase.from(...).update(...)...` sin desestructurar ni chequear `{ error }`. Si hay un fallo de RLS (un UPDATE sin policy correspondiente es no-op silencioso, 0 filas sin error) o un error real, no se entera nadie.
- **Impacto:** markFollowFeedRead corre en cada carga de /booker/seguidos: si fallara, los updates quedarían marcados 'no leídos' para siempre (borde naranja permanente). markPitchViewedAction: si falla, el token del DJ no se consume / el pitch no se marca visto y el DJ nunca ve 'visto'. Degradan en silencio sin telemetría.
- **Fix:** Desestructurar `{ error }` y `console.error(...)` (mismo patrón que listMyFavorites:577 y claimBookingsByEmail:540) para al menos dejar rastro en logs.

### ⚪ [BAJO] Corazón no se re-sincroniza si el mismo DJ aparece en varias cards
- **Dónde:** `src/components/booker/favorite-button-client.tsx:41-77`  · tipo: friccion
- **Qué:** FavoriteButtonClient carga su estado una sola vez por fetch en el useEffect (deps [djUserId]) y nunca vuelve a sincronizarse. Si el mismo DJ aparece en 2 cards de la grilla y el usuario lo favoritea en una, la otra instancia queda con `favorited` viejo hasta recargar. NotifyToggleIcon ya resolvió exactamente este problema (M9) con un `useEffect(()=>setOn(initial),[initial])` + router.refresh(); FavoriteButtonClient no hace router.refresh() tras el toggle ni re-sincroniza.
- **Impacto:** Desincronización visual menor: dos corazones del mismo DJ con estado distinto en la misma grilla. No corrompe datos (el server es la verdad), solo confunde. Probabilidad baja en /buscar (DJs únicos por user_id), mayor si en el futuro un DJ se lista dos veces.
- **Fix:** Tras toggleFavoriteAction OK, llamar router.refresh() (como NotifyToggleIcon) o levantar el estado de favoritos al server render de la página y pasar initial por prop, evitando instancias divergentes.

### ⚪ [BAJO] Contraoferta acepta fecha de evento en el pasado
- **Dónde:** `src/app/b/[token]/counteroffer-form.tsx:119-124 y src/app/b/[token]/actions.ts:79 (counter_event_date)`  · tipo: friccion
- **Qué:** El <input type=date> de la contraoferta no tiene `min`, y submitCounterofferAction guarda `counter_event_date: eventDate || null` sin validar que sea >= hoy. El booker puede proponer una 'nueva fecha' anterior a hoy.
- **Impacto:** El DJ recibe una contraoferta con una fecha de evento ya pasada, que no tiene sentido agendar. Es ruido más que un bug de datos, pero ensucia el flujo de negociación.
- **Fix:** Poner `min={new Date().toISOString().slice(0,10)}` en el input y/o rechazar en la action las fechas anteriores a hoy (en hora de Chile).

### ⚪ [BAJO] markReceivedPitchesViewed quedó como código muerto
- **Dónde:** `src/lib/queries/booker.ts:457-468`  · tipo: error
- **Qué:** El JSDoc dice 'Se llama al cargar /booker/pitches' y marca TODOS los pitches como vistos en bulk, pero la página /booker/pitches ya NO la llama: ahora usa markPitchViewedAction por-pitch (al abrir el press kit, vía PitchPressKitLink). grep confirma 0 referencias a markReceivedPitchesViewed fuera de su definición.
- **Impacto:** Ninguno funcional, pero es una función exportada engañosa: su comentario contradice el comportamiento real (que precisamente se cambió para no gastar tokens sin lectura real). Riesgo de que alguien la re-conecte por error y vuelva al bug viejo de marcar todo en bulk.
- **Fix:** Eliminar markReceivedPitchesViewed (y su comentario) o, si se quiere conservar, documentar que está deprecada en favor de markPitchViewedAction.

### ⚪ [BAJO] Versión del portal hardcodeada en footers (v0.13) — riesgo de quedar desactualizada
- **Dónde:** `src/app/booker/layout.tsx:77 y src/app/b/[token]/page.tsx:298`  · tipo: friccion
- **Qué:** El string de versión 'v0.13' está hardcodeado en dos footers distintos (layout del portal y vista tokenizada). No deriva de package.json ni de una constante compartida.
- **Impacto:** Cosmético: al subir versiones es fácil que un footer quede en una versión y el otro en otra (ya están en archivos separados). No afecta funcionalidad.
- **Fix:** Centralizar la versión en una constante (o leer de package.json/env) y reusarla en ambos footers.

---

## Admin backoffice (src/app/(app)/admin/*, queries admin/founding-invites/email-campaigns, api feedback/nps/unsubscribe/resend-webhook)

_La zona está mayormente sana: el gating admin (assertAdmin) está bien aplicado en cada page y action, los guards no-self/no-admin de banear/eliminar están presentes, la firma Svix se verifica con timingSafeEqual y el bucket de screenshots es privado con signed URLs. Encontré 12 hallazgos reales: el más serio es el cap silencioso de 3000 eventos en el dashboard de campañas (subcuenta entregados/aperturas en la campaña de 861 DJs), seguido de un GET mutante en /api/unsubscribe (prefetchers de correo pueden auto-desuscribir fans) y un puñado de updates de Supabase cuyo {error} no se chequea (fallos mudos). El resto son fricciones de bajo impacto._

### 🟠 [MEDIO] Cap silencioso de 3000 eventos subcuenta entregados/aperturas en la campaña grande · _confirmado_
- **Dónde:** `src/lib/queries/email-campaigns.ts:84-117`  · tipo: bug
- **Qué:** getCampaignDashboard lee email_events con .order("occurred_at", { ascending: false }).limit(3000) y luego calcula distinct("delivered"/"opened"/"clicked") sobre ese subconjunto. La campaña de invitación beta son 861 DJs (memory beta_invite_campaign_drop), y cada envío genera varios eventos (sent, delivered, opened, clicked, a veces delivery_delayed). 861 × ~3-4 eventos ya supera 3000. Como el orden es DESC por fecha, los eventos MÁS VIEJOS (los delivered/opened de las primeras tandas) se truncan, por lo que los conteos distintos quedan por debajo del valor real sin ningún aviso.
- **Impacto:** El admin ve métricas de entregabilidad falsas (entregados/aperturas/clicks subcontados) justo en la única campaña real y grande. Las decisiones de 'pausar tandas' por bounce/queja se toman sobre datos truncados.
- **Fix:** No traer eventos crudos para contar: hacer conteos distinct por event_type en SQL (RPC o head:true con filtros), o paginar por rango hasta agotar. Si se sigue trayendo crudo, subir el límite muy por encima del total posible y ordenar ascendente, o contar resend_id distintos por tipo en la DB.
- **Verificación:** El código en src/lib/queries/email-campaigns.ts:81-86 hace exactamente lo que afirma el hallazgo: trae email_events crudos con .order("occurred_at",{ascending:false}).limit(3000) y luego distinct() (líneas 107-116) construye los Set de delivered/bounced/complained/opened/clicked en memoria SOBRE ese array ya capado a 3000. No hay count(distinct) en SQL ni paginación; el cap de 3000 es un techo dur…

### 🟠 [MEDIO] El GET de /api/unsubscribe muta estado: prefetchers de correo pueden auto-desuscribir fans · _confirmado_
- **Dónde:** `src/app/api/unsubscribe/route.ts:46-66`  · tipo: bug
- **Qué:** El handler GET, ante un ?rsvp=<id>, llama unsubscribeFanByRsvp(rsvp) que hace un UPDATE notify_future=false (events.ts:284-287) ANTES de mostrar la página de confirmación. Los GET deben ser idempotentes/sin efectos. Escáneres de seguridad de correo (Outlook SafeLinks, antivirus, prefetch de Gmail) siguen automáticamente los links de los emails con GET, disparando la baja sin que el fan haya hecho clic.
- **Impacto:** Fans dados de baja de los avisos de shows sin haberlo pedido, porque el cliente de correo prefetcheó el link. Pérdida silenciosa de audiencia para los DJs.
- **Fix:** El GET debe mostrar una página de confirmación con un botón que haga el POST real (one-click POST de Gmail). Mover el UPDATE solo al POST. Si se quiere mantener el link directo, usar un token de un solo uso y confirmar en pantalla.
- **Verificación:** El hallazgo es real y la cadena completa está en el código. (a) route.ts:60-62 — el handler GET, ante ?rsvp=<id>, llama unsubscribeFanByRsvp(rsvp) ANTES de devolver el HTML de confirmación. (b) events.ts:272-288 — esa función NO es un no-op silencioso: usa createAdminClient() (service role, bypassa RLS) y hace .update({ notify_future: false }).eq("email", fanEmail) para TODAS las filas event_rsvps…

### ⚪ [BAJO] Acciones del inbox no chequean {error} de Supabase (fallos mudos) · _confirmado_
- **Dónde:** `src/app/(app)/admin/correo/actions.ts:55-92`  · tipo: bug
- **Qué:** markEmailRead, archiveEmail, toggleStar, deleteEmail, restoreEmail (y storeSent en :20-34, y el update de read_at en sendReply :134-137) hacen .update()/.insert() y descartan el resultado sin leer {error}. Si el UPDATE falla (RLS, columna, conexión) la acción igual revalida y la UI muestra el cambio aplicado.
- **Impacto:** El admin archiva/borra/marca-leído un correo, ve que 'funcionó' tras el revalidate, pero el cambio no se persistió. Pérdida de confianza y estados inconsistentes (ej. 'Enviados' sin la copia del correo).
- **Fix:** Capturar { error } en cada update/insert y propagarlo (estas son void; convertir a Result o al menos console.error + lanzar para que la UI lo note).
- **Verificación:** Verifiqué el archivo src/app/(app)/admin/correo/actions.ts. El patrón existe textualmente: markEmailRead (:58-62), archiveEmail (:69), toggleStar (:76), deleteEmail (:83), restoreEmail (:90), storeSent (:23-33) y el update de read_at en sendReply (:134-137) hacen .update()/.insert() y descartan el resultado sin leer {error}, seguido de revalidatePath. Confirmado que NINGUNO hace console.error ni p…

### ⚪ [BAJO] unsubscribeFanByRsvp da de baja TODAS las RSVP que comparten ese email
- **Dónde:** `src/lib/queries/events.ts:276-288`  · tipo: friccion
- **Qué:** Resuelve el email a partir del rsvpId y luego hace update notify_future=false .eq("email", fanEmail) sobre TODAS las filas con ese email, no solo la RSVP del link. Además no chequea el {error} del update.
- **Impacto:** Comportamiento posiblemente deseado (baja global del fan), pero combinado con el GET mutante del hallazgo anterior amplifica el daño: un prefetch da de baja al fan de todos los eventos a la vez. Si el update falla, devuelve ok:true igual.
- **Fix:** Documentar/confirmar que la baja es global a propósito; chequear el {error} del update y reflejarlo en el return.

### ⚪ [BAJO] Webhook Resend no valida la antigüedad del svix-timestamp (sin protección de replay)
- **Dónde:** `src/app/api/resend/webhook/route.ts:24-46`  · tipo: bug
- **Qué:** verifySvix incluye el timestamp en el string firmado pero nunca comprueba que esté dentro de una ventana de tolerancia (ej. ±5 min). El estándar Svix verifica firma Y antigüedad para evitar replay. Una request válida capturada puede reenviarse indefinidamente y pasará la verificación.
- **Impacto:** Bajo porque los writes son upserts idempotentes por resend_id (un replay no duplica filas). Pero un atacante con una request capturada podría reinyectar eventos viejos (ej. reescribir last_event a un estado anterior).
- **Fix:** Parsear svix-timestamp (unix seconds) y rechazar si abs(now - ts) > 300s, igual que la lib oficial de Svix.

### ⚪ [BAJO] markFoundingInviteSent / revokeFoundingInvite ignoran {error}
- **Dónde:** `src/lib/queries/founding-invites.ts:104-118`  · tipo: bug
- **Qué:** Ambas funciones hacen .update() sobre founding_invites y descartan el resultado. revokeFoundingInviteAction (actions.ts:84-95) llama a revokeFoundingInvite y luego devuelve ok:true incondicionalmente.
- **Impacto:** Si la revocación de un invite VIP falla en la DB, el admin ve 'revocada' en la UI pero el token sigue activo y reutilizable. Inconsistencia entre UI y estado real del token single-use.
- **Fix:** Hacer que revokeFoundingInvite/markFoundingInviteSent devuelvan/lancen el error y que la action lo propague.

### ⚪ [BAJO] BetaReminderPage es la única page admin que no llama assertAdmin() en el top
- **Dónde:** `src/app/(app)/admin/beta-reminder/page.tsx:11-13`  · tipo: friccion
- **Qué:** Todas las demás pages de /admin abren con `await assertAdmin()`. Esta delega el gating a listBetaReminderRecipients() (que sí redirige). Funciona hoy, pero si alguien refactoriza esa query para no redirigir (o agrega contenido antes de invocarla), la página quedaría expuesta. Patrón frágil e inconsistente con el resto.
- **Impacto:** Hoy no hay fuga (la query redirige), pero la defensa de la página depende de un efecto secundario de una función de datos en vez de un guard explícito.
- **Fix:** Agregar `await assertAdmin()` como primera línea del componente, igual que en page.tsx, analytics, bookers, etc.

### ⚪ [BAJO] Chips de verificación: toggle optimista sin manejo de error ni feedback
- **Dónde:** `src/app/(app)/admin/dj-verification-chips.tsx:27-32`  · tipo: friccion
- **Qué:** toggle() llama setDjVerificationAction y luego router.refresh() sin inspeccionar el resultado ({ ok, error }). Si la action falla, no hay mensaje y el chip vuelve a su estado anterior tras el refresh sin explicación. Mismo patrón silencioso que VerifyDjButton/DropPickButton/VerifyBookerButton.
- **Impacto:** El admin clickea 'verificar Redes', no pasa nada visible, y no sabe si falló o si el trigger lo bloqueó. setDjVerificationAction además hace un read-modify-write de verifications (líneas actions.ts:67-80) sujeto a race si se togglean dos chips a la vez.
- **Fix:** Inspeccionar res.ok y mostrar feedback de error. Para la race del array, considerar update atómico en SQL (array_append/array_remove) en vez de read-modify-write.

### ⚪ [BAJO] notifyAndDeleteUserAction no tiene guard explícito no-self
- **Dónde:** `src/app/(app)/admin/actions.ts:141-234`  · tipo: friccion
- **Qué:** A diferencia de deleteUserAction (:334) y setAccountStatusAction (:261) que comparan userId === adminId, esta función solo se apoya en el check is_admin (un admin no puede borrarse porque es is_admin=true) y onboarding_completed_at. El guard funciona transitivamente pero no es explícito.
- **Impacto:** Hoy no hay forma de auto-borrarse (admin bloqueado por is_admin). Pero la protección es implícita; si un admin alguna vez tuviera onboarding incompleto e is_admin pendiente, el borde se vuelve frágil.
- **Fix:** Agregar el mismo `if (userId === adminId) return error` por consistencia y defensa explícita.

### ⚪ [BAJO] fmtDate de campañas parsea la fecha en TZ del servidor (no Chile)
- **Dónde:** `src/app/(app)/admin/email-campaigns/page.tsx:35-40`  · tipo: friccion
- **Qué:** fmtDate hace new Date(`${d}T12:00:00`) sin sufijo Z ni timeZone, así que se interpreta en la zona del runtime (UTC en Vercel). El anclaje a las 12:00 evita el off-by-one en la mayoría de los casos, pero el día mostrado puede no coincidir con el día-Chile de la tanda. todayStr en email-campaigns.ts:93 también usa new Date().toISOString().slice(0,10) = día UTC, no día Chile.
- **Impacto:** Las etiquetas de fecha de las tandas y la marca done (date <= todayStr) pueden desfasarse un día respecto a la hora de Chile, especialmente entre 21:00-00:00 CLT.
- **Fix:** Calcular todayStr y formatear las fechas con timeZone: 'America/Santiago' (Intl.DateTimeFormat con esa zona).

### ⚪ [BAJO] Conteo enviados/programados se basa solo en scheduled_at vs now
- **Dónde:** `src/lib/queries/email-campaigns.ts:95-105`  · tipo: friccion
- **Qué:** Un email_sends con scheduled_at en el pasado se cuenta como 'enviado' aunque no tenga resend_id (nunca llegó a salir) o haya fallado. No se cruza con last_event para validar que efectivamente se envió.
- **Impacto:** El KPI 'Enviados' puede inflarse con filas programadas que pasaron de fecha pero nunca se mandaron de verdad. Edge, pero distorsiona el numerador de las tasas de rebote/queja.
- **Fix:** Considerar 'enviado' solo si hay resend_id o last_event presente; o separar 'programado vencido sin enviar' como categoría aparte.

### ⚪ [BAJO] listFeedbackReports hace N llamadas getUserById + N signed URLs en paralelo
- **Dónde:** `src/lib/queries/beta.ts:240-270`  · tipo: friccion
- **Qué:** Por cada user_id único hace admin.auth.admin.getUserById (no hay batch) y por cada reporte un createSignedUrl, todo en Promise.all. Con limit:200 y muchos reporters distintos son cientos de round-trips al arrancar /admin/feedback. Los errores individuales se tragan con catch vacío (esperado para users borrados, pero también oculta rate-limits de la Admin API).
- **Impacto:** Página de feedback lenta a medida que crece el volumen; si la Admin API tira rate-limit, los emails simplemente no aparecen (quedan en null) sin señal de por qué.
- **Fix:** Cachear/lotear los emails (ej. una sola listUsers paginada y mapear, como ya hace getAllUsers) en vez de N getUserById; loguear errores no esperados.

---

## Tráfico + analytics admin + notificaciones

_La zona funciona razonablemente para el volumen beta actual, con buenas decisiones (is_registered decidido en server, rate-limit en endpoints públicos, RLS sin policies + service_role, embudo con count head:true). Pero hay un bug funcional real de tráfico (cap de 20.000 con orden DESC que sesga la serie por día y los conteos cuando el volumen crece), una etiqueta de retención D15 que en realidad mide una ventana de 3 días, varios inserts/updates de Supabase con {error} no chequeado (fallos mudos) y el cron de push que escala O(usuarios × queries) sin protección de timeout. Nada catastrófico hoy, pero el cap y el D15 entregan números incorrectos sin avisar._

### 🟠 [MEDIO] Cap de 20.000 filas con orden created_at DESC trunca y sesga la serie por día y todos los conteos · _confirmado_
- **Dónde:** `src/lib/queries/site-analytics.ts:54-67`  · tipo: bug
- **Qué:** El query trae site_events con .order("created_at", { ascending: false }).limit(20000). Cuando los pageviews en la ventana superan 20.000, Supabase devuelve SOLO los 20.000 MÁS RECIENTES (por el DESC). A partir de ahí todo se computa sobre ese subconjunto: totalViews, sesiones, anonSessions, byDay (que rellena días con ceros) y topPaths/topReferrers. El resultado es un cap silencioso: los días más antiguos del rango aparecen artificialmente vacíos o bajos y los totales se congelan en ~20k sin ninguna señal. En rango de 30 días esto es alcanzable con tráfico modesto sostenido. Además el {error} del query se traga a [] (línea 61: `error ? [] : data ?? []`), así que un fallo de la query muestra 'sin tráfico' en vez de error.
- **Impacto:** Las métricas del panel (visitas, sesiones, conversión, estadía, serie diaria) se vuelven incorrectas y subestimadas en cuanto el sitio tenga tráfico real, sin que nadie lo note: los días viejos del gráfico se vacían y los totales mienten. Decisiones de growth basadas en datos truncados.
- **Fix:** Para conteos y serie por día usar count head:true o agregación SQL (RPC con date_trunc en America/Santiago y group by) en vez de traer filas crudas y agregar en memoria. Si se mantiene el approach en memoria, al menos detectar rows.length === 20000 y marcar el panel como 'parcial', y/o ordenar ASC para no perder el inicio de la ventana. Idealmente una vista materializada o RPC server-side hace el grouping sin tope.
- **Verificación:** El código en src/lib/queries/site-analytics.ts:54-59 dice exactamente lo que afirma el hallazgo: `.select(...).gte("created_at", cutoff).order("created_at", { ascending: false }).limit(20000)`. Con orden DESC + limit(20000), si las filas de la ventana superan 20k, Supabase devuelve SOLO las 20k más recientes, y los días más antiguos del rango quedan truncados. TODO se agrega en memoria sobre ese s…

### 🟠 [MEDIO] Retención "D15" usa ventana de actividad de 3 días (past3) en vez de 15 · _confirmado_
- **Dónde:** `src/lib/queries/analytics.ts:42-79`  · tipo: bug
- **Qué:** El comentario dice 'cuántos tuvieron page_view en últimos 7/3d' y el código define past7 (7 días) y past3 (3 días). D7Active filtra usage_events con .gte("created_at", past7) — correcto. Pero D15Active usa .gte("created_at", past3), es decir una ventana de actividad de 3 días, no 15. El KPI de la página /admin/analytics se titula 'RETENCIÓN D15' y muestra d15Active/d15Candidates como si midiera retención a 15 días. La cohorte (candidatos aprobados hace ≥15d) sí es correcta, pero la ventana de actividad reciente es de 3 días, lo que hace el % artificialmente bajo e inconsistente con D7.
- **Impacto:** El número de retención D15 que ve el admin no significa lo que dice la etiqueta: cuenta usuarios activos en 3 días, no en 15. Métrica clave de salud de la beta reportada mal.
- **Fix:** Definir y usar past15 = new Date(now - 15*24*60*60*1000).toISOString() para d15Active, o documentar explícitamente la ventana real en la UI. Si la intención era 'activos en los últimos 3 días entre los aprobados hace 15+', renombrar el KPI para que no diga D15.
- **Verificación:** El hallazgo es real y verificado en código. En src/lib/queries/analytics.ts:42-43 se definen past7 (7 días) y past3 (3 días); no existe past15. d7Active (líneas 60-69) filtra usage_events con .gte("created_at", past7) → ventana de 7 días, correcta. d15Active (líneas 70-79) filtra con .gte("created_at", past3) → ventana de actividad de SOLO 3 días, no 15. La cohorte sí es correcta (d15CandidateIds …

### 🟠 [MEDIO] Insert a site_events sin chequear {error}: fallo mudo del tracking · _confirmado_
- **Dónde:** `src/app/api/site-track/route.ts:58-68`  · tipo: bug
- **Qué:** El `await admin.from("site_events").insert({...})` no captura ni inspecciona el {error} que devuelve Supabase, y el endpoint retorna 204 incondicionalmente. Si el insert falla (columna ausente, RLS sobre service_role mal configurado, tabla caída, payload inválido), el beacon recibe 204 'OK' y el evento se pierde sin log ni señal. Combinado con que el cliente es fire-and-forget (sendBeacon), un fallo de inserción es 100% invisible: el panel simplemente mostraría menos tráfico del real.
- **Impacto:** Pérdida silenciosa de datos de tráfico ante cualquier error de inserción; imposible de diagnosticar porque no hay log de error en el servidor.
- **Fix:** Capturar `const { error } = await admin.from('site_events').insert(...)` y al menos `if (error) console.error('site-track insert', error)`. El status al cliente puede seguir siendo 204 (no romper UX), pero el error debe quedar logueado.
- **Verificación:** El hallazgo es real y la cita es exacta. En src/app/api/site-track/route.ts:58-68 el insert `await admin.from("site_events").insert({...})` NO desestructura ni inspecciona `{error}`, no hay try/catch alrededor, no hay console.error, y la línea 68 retorna 204 incondicionalmente. No existe mitigación en otro lado: el cliente (src/components/site-tracker.tsx:43-47) es fire-and-forget vía navigator.se…

### ⚪ [BAJO] Updates/deletes de push_subscriptions en sendPushToUser ignoran {error} (no-op silencioso bajo RLS) · _incierto_
- **Dónde:** `src/lib/push/server.ts:81-110`  · tipo: bug
- **Qué:** Tras enviar cada push, se hace update de last_used_at/last_error y, ante 404/410, delete de la subscription muerta. Ninguno captura {error}. Como ya advierte el gotcha del codebase, un UPDATE/DELETE sin policy correspondiente es no-op silencioso (0 filas, sin throw). Aquí va por service_role (admin client) así que normalmente RLS no aplica, pero si en algún momento se cambia el cliente o falla la escritura, las subscriptions muertas (410/404) NUNCA se borrarían y last_error nunca se registraría, sin ninguna señal. El cron seguiría intentando enviar a endpoints muertos cada día.
- **Impacto:** Acumulación de subscriptions zombie que inflan failed en el cron y nunca se limpian; el campo last_error de diagnóstico podría quedar siempre vacío sin que se sepa por qué.
- **Fix:** Chequear el {error} de cada update/delete y loguearlo (console.error) cuando exista. El delete por 410 es el más importante: confirmar que efectivamente borró.
- **Verificación:** El código en src/lib/push/server.ts:84-105 efectivamente descarta el {error} de los tres writes: update de last_used_at/last_error (84-87), delete por 404/410 (97-100) y update de last_error en otros fallos (102-105). Eso es real y coincide con el gotcha conocido del codebase (.update()/.delete() sin chequear error = fallo mudo).

PERO el impacto alegado se sostiene sobre condiciones que HOY no ex…

### ⚪ [BAJO] send-cron evalúa triggers por usuario con N queries cada uno, secuencial, sin cap ni protección de maxDuration · _confirmado_
- **Dónde:** `src/app/api/push/send-cron/route.ts:251-294`  · tipo: bug
- **Qué:** El cron hace `select user_id` de TODAS las push_subscriptions (sin .limit alto explícito → cap por defecto de 1000 filas de Supabase: si hubiera más de 1000 subscriptions, se cortarían usuarios silenciosamente) y luego, por CADA usuario, ejecuta buildTriggers que dispara ~7 queries secuenciales (y dentro del trigger 4, un query por plataforma por campaña anidado, ver línea 122-131). Todo es secuencial dentro de un for. maxDuration=120s. Con decenas/cientos de usuarios la latencia acumulada puede exceder el timeout y abortar el cron a mitad de camino, dejando a usuarios sin evaluar sin reintento, y sin marcar dónde se cortó.
- **Impacto:** A medida que crece la base, el cron se vuelve lento y puede timeoutear, entregando notificaciones parciales/inconsistentes. El cap de 1000 en el select de user_id además omite usuarios silenciosamente si la tabla crece.
- **Fix:** Hacer el select de subscriptions con count/rango o .limit explícito alto y deduplicar user_id en SQL (distinct). Paralelizar buildTriggers con concurrencia acotada (p.ej. Promise.all en lotes) o mover la evaluación a SQL agregada. Considerar batching/cursor para no exceder maxDuration.
- **Verificación:** El código en src/app/api/push/send-cron/route.ts es exactamente como lo describe el hallazgo, y verifiqué los tres puntos:

(a) El código dice lo que se afirma. Líneas 253-255: `admin.from("push_subscriptions").select("user_id")` SIN `.limit()` → aplica el cap por defecto de 1000 filas de Supabase. Como una sola persona puede tener varias filas (la subscribe route hace upsert con onConflict "user_…

### ⚪ [BAJO] Endpoints /api/push/subscribe, /unsubscribe y /test sin rate-limit
- **Dónde:** `src/app/api/push/test/route.ts:15-52`  · tipo: friccion
- **Qué:** site-track (max 80/min) y usage (60/min) usan rateLimit, pero los endpoints de push no. /api/push/test invoca sendPushToUser, que lee subscriptions y manda push reales vía web-push por cada request; un usuario autenticado podría martillarlo para auto-spamearse o generar carga/coste de envío. subscribe/unsubscribe escriben en DB sin límite. Requieren sesión (mitiga el abuso anónimo), por eso es bajo, pero un usuario logueado abusivo no tiene freno.
- **Impacto:** Un usuario autenticado puede abusar de /push/test para dispararse notificaciones en loop o cargar el servidor; subscribe/unsubscribe sin límite permiten escrituras en ráfaga.
- **Fix:** Aplicar rateLimit (p.ej. key por user.id, max bajo como 5-10/min para /test) igual que en site-track/usage.

### ⚪ [BAJO] Se almacena referrer completo (URL con query string) y utm_source sin verificar largo real de PII
- **Dónde:** `src/components/site-tracker.tsx:40,src/app/api/site-track/route.ts:63`  · tipo: friccion
- **Qué:** El cliente envía document.referrer crudo (URL completa, incluyendo path y query string del sitio referente) y se guarda recortado a 300 chars en site_events.referrer. URLs de referencia pueden traer query params con datos sensibles (tokens, emails en utm, ids). Para mostrar 'de dónde llegan' getSiteTraffic solo usa el hostname (refSource), así que guardar la URL completa es más PII de la necesaria. country (cf-ipcountry) es solo código de país, no PII fuerte.
- **Impacto:** Almacenamiento de datos potencialmente sensibles en referrers que nunca se usan más allá del hostname; superficie innecesaria para una política de privacidad que promete 'cero cookies de terceros, cero GA'.
- **Fix:** Normalizar a hostname (o origin) antes de insertar el referrer, o documentar la retención. utm_source ya está acotado a 120 y es de bajo riesgo.

### ⚪ [BAJO] Feed 'Últimas visitas (tiempo real)' usa el índice del array como key de React
- **Dónde:** `src/app/(app)/admin/trafico/page.tsx:171-172`  · tipo: friccion
- **Qué:** El feed en vivo mapea t.recent con `key={i}` (índice). Como LiveRefresher hace router.refresh cada 15s y la lista cambia (nuevas visitas entran arriba), usar el índice como key hace que React reutilice nodos por posición en vez de por identidad. El query trae id pero getSiteTraffic.recent lo descarta (solo expone path/is_registered/created_at), así que no hay key estable disponible.
- **Impacto:** Parpadeos/reconciliación incorrecta del feed al refrescar; cosmético dado el volumen, pero es exactamente el anti-patrón de keys en una lista que muta en vivo.
- **Fix:** Incluir el id de site_events en SiteTraffic.recent y usarlo como key, o componer una key estable (created_at + session_id + path).

### ⚪ [BAJO] Auto-refresh cada 15s re-ejecuta getSiteTraffic completo (4+ queries) por cada admin con la pestaña abierta
- **Dónde:** `src/app/(app)/admin/trafico/live-refresher.tsx:16-19`  · tipo: friccion
- **Qué:** LiveRefresher hace router.refresh() cada 15s mientras la pestaña esté visible, lo que re-corre el server component TraficoPage → getSiteTraffic, que lanza el select grande de site_events + 3 counts (beta/dj/booker) cada vez. Con la página abierta de fondo todo el día son ~5.760 ejecuciones/día del set de queries por admin. El gating por visibilityState ayuda, pero el intervalo es agresivo para un panel de tráfico beta.
- **Impacto:** Carga y egress innecesarios contra Supabase (PRO, pero igual cuenta) por un dato que cambia lento; el query grande de site_events es el más caro y se repite cada 15s.
- **Fix:** Subir el intervalo (60s suele bastar para 'en vivo') o separar el feed 'recent' (refresco frecuente, query chico) del resto de KPIs (refresco lento). Considerar fetch incremental del feed en vez de re-render completo.

---

## ✅ Falsos positivos descartados por el verificador

- **CAPTCHA de login/signup/reset depende 100% de config de Supabase (puede ser decorativo)** — El código sí dice lo que el hallazgo afirma (parte a confirmada): los 4 flujos —login (login-form.tsx:104-108), signup DJ (:151-162), signup booker (booker-signup-form.tsx:106-120) y forgot-password (forgot-password-form.tsx:49-51)— pasan captchaToken directo …
- **/auth/reset-password muestra el form de nueva contraseña a cualquier sesión, no solo recovery** — Las mecánicas técnicas del hallazgo son correctas: src/app/auth/reset-password/page.tsx:18-35 gatea el form solo con getUser() truthy, sin distinguir sesión de recovery de sesión normal, y reset-password-form.tsx:44 llama supabase.auth.updateUser({ password })…
- **Sync de eventos all_day: end.date exclusivo + T23:59:59Z mal interpretado en tz** — El código en src/app/(app)/calendario/actions.ts:237-240 (y su espejo en src/lib/calendar/sync-job.ts:137-141) efectivamente hace start = `${ev.start.date}T12:00:00Z` y end = `${ev.end.date}T23:59:59Z`. Pero al rastrear los consumidores, el impacto alegado no …
- **handlePreapproval sobrescribe el status sin guarda de idempotencia ni orden → puede regresar 'active' a 'pending'** — El código literal coincide (route.ts:136-162: el switch cae a 'pending' en default y el update es incondicional sin leer estado actual ni orden de evento), PERO el mecanismo y el impacto alegados están refutados por dos mitigaciones que el hallazgo no consider…
- **deleteCampaign y removeCampaignContact ignoran {error} → no-op silencioso** — El código se confirma textualmente: deleteCampaign (src/lib/queries/campaigns.ts:88-95) y removeCampaignContact (205-212) hacen .delete().eq("user_id").eq("id") y retornan void sin chequear {error}; deleteCampaignAction (src/app/(app)/campanas/actions.ts:63-67…
- **Triggers 'lunes' y 'miércoles' del cron usan getUTCDay(), no día de Chile** — El código cita correctamente lo afirmado: src/app/api/push/send-cron/route.ts:81 usa `today.getUTCDay() === 1` (Trigger 3, lunes) y :150 usa `=== 3` (Trigger 5, miércoles), con el comentario "UTC para consistencia con el cron schedule". Hasta ahí el hallazgo e…

## ❓ Inciertos (requieren runtime/sesión para confirmar)

- **deleteGrowthCampaign / deleteContentPost / deleteSnapshot ignoran {error} → borrado puede ser no-op silencioso** (`src/lib/queries/growth.ts:206-213`)
- **El callback de Gmail sobrescribe el refresh_token con cadena vacía al reconectar** (`src/app/api/gmail/callback/route.ts:69`)
- **Updates/deletes de push_subscriptions en sendPushToUser ignoran {error} (no-op silencioso bajo RLS)** (`src/lib/push/server.ts:81-110`)

## 🟡 Runtime (flujos públicos en vivo)

- **[MEDIO] Header sin menú en móvil:** en ≤768px solo se ven el logo y "Entrar"; los links (Buscar DJs, Eventos, Cómo funciona, Para DJs) están `hidden md:flex` y no hay hamburguesa. Los fans (mayoría móvil desde IG/WhatsApp) no pueden llegar a /eventos ni /dj desde el nav. `src/components/public/site-chrome.tsx`.
- Resto del runtime público sano: landing, /dj + filtro género (house→11), /p/[slug], /eventos, /e/<bad>→404, /login, /signup/booker, /beta, /auth/forgot-password (200, sin voseo, sin errores de consola).
