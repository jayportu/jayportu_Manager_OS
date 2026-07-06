# PERFORMANCE_AUDIT_DROP — Auditoría técnica de rendimiento y consumo de recursos

- **App auditada:** DROP. — "The DJ OS" (`dropgigs.com`) · repo `jayportu_Manager_OS/`
- **Stack:** Next.js 15.5.19 (App Router) · React 18 · TypeScript · Supabase (Auth/Postgres/Storage) · Vercel · Cloudflare · Resend · MercadoPago · web-push · Sentry
- **Fecha:** 2026-07-06
- **Modo:** solo auditoría, **sin cambios de código**. No se tocó producción, no se corrieron scripts contra la BD, no se hizo `git add`.
- **Segunda aplicación:** no existe otra app con código en el workspace; el único `package.json` (fuera de `node_modules`) es el de DROP. Todo lo externo a `jayportu_Manager_OS/` se trató como intocable.

> **Veredicto de una línea:** DROP está **notablemente más optimizada de lo esperado** en fetching/BD, memoria y arquitectura de datos. **No hay hallazgos Críticos.** El ahorro real está en **round-trips de auth por request** (`getUser()` sin `cache()`) y en resiliencia de crons/timeouts. El resto son mejoras Medias/Bajas de bajo riesgo.

> ### ⚠️ CORRECCIÓN (verificación posterior, 2026-07-06)
> Durante la implementación se **verificó empíricamente** el bundle y **P-01 resultó ser un falso positivo**. El chunk compartido de 126 KB (`6101`) que aparece en "First Load JS shared by all" **NO es Supabase**: es el **runtime de React DOM + Next.js App Router** (contiene `createRoot`; `grep` de `GoTrueClient/supabase/realtime/postgrest` sobre `.next/static/chunks/6101-*.js` = **0 coincidencias**). Es el baseline de framework de cualquier app React/Next — **no reducible**.
> El cliente **Supabase real** vive en el chunk `1613` (~180 KB raw; `GoTrueClient`, `createBrowserClient`×5, `supabase`×64) y **solo carga en 7 de 122 rutas** (las 4 de auth + `(app)/layout` + `configuracion` + `perfil`), **NO en las páginas públicas**. La medición dinámica de la home mostró el chunk `6101` (framework), no Supabase.
> **Consecuencia:** P-01 queda **DESCARTADO** y P-02 baja de Alto a Bajo (el peso de Supabase en las páginas de auth es intrínseco: login/signup lo necesitan). El "mayor lever de bundle" del informe original **no existe**. El bundle está sano. Ver filas corregidas P-01/P-02 abajo. Lección: el fingerprint de chunk del análisis de bundle era una **hipótesis presentada como evidencia**; la verificación lo corrigió.

---

## Metodología, herramientas y límites (evidencia vs hipótesis)

**Herramientas usadas:**
- **Análisis estático dirigido** del código (lectura + `grep` estructurado) sobre las rutas calientes, con 5 líneas de investigación en paralelo: render/hooks, memoria/limpieza, boundaries Client/Server + bundle, fetching/BD/caché, y backend/infra/assets.
- **`next build` real** (Next 15.5.19, exit 0) para medir *First Load JS* por ruta, chunk compartido y tamaño de middleware.
- **`du`/inspección de `.next`** para pesos de assets y fingerprint de chunks.
- **Medición dinámica** (Playwright, navegador aislado) sobre **rutas públicas de producción** (`/` y `/p/nova-rios-demo`): Navigation Timing, FCP, CLS, transferencia y desglose de recursos.

**Límites honestos (pruebas que NO pude hacer y por qué):**
- **No hay profiling autenticado** (React Profiler, Chrome Performance/Memory del dashboard, CRM, calendario). El login local está bloqueado por CAPTCHA/Turnstile y **no debo golpear producción autenticado** ni usar `service_role`. Todo lo relativo a re-renders del área privada es **hipótesis basada en lectura de código**, no medición.
- **LCP no capturado:** el trace de Chrome DevTools (que da LCP/INP) falló porque el perfil de Chrome estaba en uso; `getEntriesByType('largest-contentful-paint')` vía Playwright post-load devolvió vacío. Reporto FCP/Load reales y marco LCP como pendiente de medición con Lighthouse throttled.
- **Sin `EXPLAIN` en la BD:** cualquier afirmación sobre índices es hipótesis (no ejecuté queries contra prod).
- La medición dinámica fue **desktop sin throttling** y con navegador frío; los números móviles reales (4G + CPU 4×) serían peores. Sirven como *baseline* direccional, no como veredicto de Web Vitals de campo.

A lo largo del informe se etiqueta **[EVIDENCIA]** (leído/medido) vs **[HIPÓTESIS]** (inferido, sin medición).

---

## 1. Mapa técnico de la aplicación

| Dimensión | Detalle |
|---|---|
| **Arquitectura** | Next.js App Router. Route group `(app)` = área privada (dashboard, calendario, crm, campañas, growth, press-kit, configuración, admin). Zona `booker/*`. Zona pública: `/` (landing), `/p/[slug]` (press kit), `/dj` + `/dj/ciudad|genero`, `/eventos`, `/b/[token]` (booking), `/e/[token]` (RSVP), auth. ~392 archivos `.ts/.tsx`. |
| **Layouts** | `app/layout.tsx` (root, Server Component: fuentes + Vercel Analytics + SiteTracker). `(app)/layout.tsx` (shell autenticado: auth + perfil + beta + suscripción + counts). `(app)/admin/layout.tsx`. `booker/layout.tsx`. |
| **Estado global** | **Mínimo.** Solo 3 archivos tocan `createContext`/`Provider` (2 layouts + confirm-dialog). Sin Redux/Zustand/Context global. → riesgo de "re-render masivo por store" **bajo**. |
| **Client vs Server** | 123 archivos `"use client"` (~31%), todos a nivel de *componente hoja*; **ningún `page.tsx`/`layout.tsx` es cliente** (boundaries correctos). 32 archivos con `"use server"` (server actions). |
| **Middleware** | `src/middleware.ts` → `updateSession` (Supabase SSR). Corre en toda request no-estática, **incluidas las `/api/*`**. Ya **exceptúa rutas públicas** de `getUser()` (bien). |
| **Integraciones externas** | Supabase (REST + Storage; realtime **no usado**), MercadoPago (server-only + Web SDK remoto), Resend (emails + webhook inbound), Google Gmail/Calendar (OAuth), Overpass/OpenStreetMap (descubrir lugares), countriesnow.space (ciudades), SoundCloud/YouTube/Spotify/Mixcloud (embeds + scraping), Cloudflare Turnstile (CAPTCHA), Sentry, Vercel Analytics + tracker propio (`/api/site-track`, `/api/track`). |
| **APIs / serverless** | ~40 rutas en `src/app/api/*` (booking, RSVP, contacto DJ, heartbeat, export, push, tracklist, webhooks MP/Resend, overpass, gmail, growth). |
| **Cron (7)** | Disparados por **GitHub Actions** (no Vercel; no hay `vercel.json`), con guard `CRON_SECRET` (`timingSafeEqual`). Frecuencias en §9. 2 están dormidos. |
| **Auth** | Supabase Auth + Turnstile. Dos clases: DJ (`dj_profile`), Booker (`booker_accounts`) + Admin. |
| **Storage** | Supabase Storage (avatares, galería, press-kit) vía `next/image` con AVIF/WebP y cache 31 días. |
| **Analítica/monitoreo** | Vercel Analytics + tracker propio + Sentry (activo). |

**Partes con mayor probabilidad de consumo excesivo (priorizadas por evidencia):**
1. **Bundle JS global** — el cliente Supabase (+realtime no usado) en el baseline de todas las rutas. *[EVIDENCIA, medido]*
2. **Round-trips de auth por navegación** — `getUser()` sin `cache()`. *[EVIDENCIA de código]*
3. **Crons con `fetch` externos sin timeout** — pueden pagar la duración máxima de la función. *[EVIDENCIA de código]*
4. **Editores/formularios controlados grandes** — re-render del árbol por tecla (área privada, no medible). *[HIPÓTESIS]*
5. **Polling** (heartbeat 60s, refrescos admin 15–30s). *[EVIDENCIA de código]*

---

## 2. Tabla maestra de hallazgos

Prioridad: **Crítico / Alto / Medio / Bajo / Sin impacto comprobado (SIC)**. Riesgo del cambio: bajo / medio / alto.

| # | Prioridad | Área | Problema | Evidencia | Archivo y línea | Impacto | Solución recomendada | Riesgo |
|---|---|---|---|---|---|---|---|---|
| ~~P-01~~ | **DESCARTADO** | Bundle | *(Corregido — ver banner arriba.)* Se creyó que Supabase pesaba en el baseline de todas las rutas. **Falso:** el chunk compartido `6101` (126 KB) es el runtime React DOM + Next.js, no Supabase; Supabase (`1613`) solo carga en 7 de 122 rutas (privadas/auth), no en públicas. | [EVIDENCIA verificada] `grep GoTrueClient/supabase/realtime` en `6101-*.js` = 0; `1613` (Supabase) ausente de rutas públicas | `.next/static/chunks/` | Ninguno: baseline público = framework (normal, no reducible) | Sin acción | — |
| P-02 | **Bajo** *(antes Alto)* | Bundle | Páginas de auth cargan el cliente Supabase (`1613`, ~180 KB raw) porque login/reset/signup **genuinamente lo usan** (`signInWithPassword`, etc.). Real pero mayormente intrínseco; realtime va incluido aunque no se use | [EVIDENCIA] `1613` = `GoTrueClient`/`createBrowserClient`×5/`supabase`×64/`realtime`×22; solo en 4 rutas auth + `(app)/layout`+configuracion+perfil | forms de auth | Solo 7 rutas; quien se loguea necesita el cliente | Opcional/bajo retorno: mover submit a server actions; trim de realtime no es trivial | medio |
| P-03 | **Alto** | Fetching/Auth | `getUser()` no está envuelto en `cache()` de React → 2–5+ round-trips de auth a Supabase por navegación autenticada | [EVIDENCIA] `grep auth.getUser()` = 100 sitios; se llama en middleware + layout + cada query helper del mismo request | `src/lib/supabase/server.ts` (sin `cache()`); `(app)/layout.tsx:34-36`; `lib/queries/contacts.ts:79-86`; `lib/supabase/middleware.ts:99-102` | Latencia serial al TTFB en cada navegación privada; multiplica la carga de Supabase Auth | `export const getCurrentUser = cache(() => createClient().auth.getUser())` y usarlo en todos los sitios del request | bajo |
| P-04 | **Alto** | Polling/Auth | Heartbeat = 3 round-trips a Supabase por DJ por minuto (middleware `getUser` + route `getUser` + `UPDATE`) | [EVIDENCIA] `presence-heartbeat.tsx:23` (60s); `/api/dj/heartbeat` no está en `PUBLIC_PATHS`; route revalida | `src/components/dj/presence-heartbeat.tsx:14-32`; `api/dj/heartbeat/route.ts:17-29`; `src/middleware.ts:8-17` | Carga base sostenida de writes + auth solo para un badge "LIVE"; escala con DJs concurrentes | Excluir `/api/dj/heartbeat` del `getUser()` del middleware (el route ya se autentica); considerar intervalo mayor | medio |
| P-05 | **Alto** | Backend/DB | N+1 en cron `follow-updates`: un SELECT `booker_favorites` por DJ en vez de un `.in()` batched | [EVIDENCIA] `for (const djId of djIds) { await admin.from("booker_favorites")…eq("dj_user_id", djId) }` | `src/app/api/follow-updates/cron/route.ts:199-208` | Round-trips lineales con nº de DJs activos; hoy acotado por beta, degrada al crecer | Un solo `.in("dj_user_id", djIds).eq("notify_email", true)` y agrupar en memoria | bajo |
| P-06 | **Alto** | Backend/resiliencia | `fetch` a Google Calendar **sin timeout** en el cron horario, con loop **secuencial** por usuario | [EVIDENCIA] `sync-job.ts:97` (fetch eventos, sin `signal`), `:62` (refresh token); `syncEventsForAllUsers:198` secuencial | `src/lib/calendar/sync-job.ts:62,97,198` | Un usuario colgado consume `maxDuration=60s` de la función y **bloquea el sync del resto** esa hora; 24 corridas/día | `signal: AbortSignal.timeout(10_000)` en ambos fetch (patrón ya usado en `soundcloud.ts:90`); `Promise.allSettled` con concurrencia acotada | bajo |
| P-07 | **Alto** | Render | `tracklist-editor`: la lista completa de tracks + KPIs + fila draft se re-renderiza en cada tecla de edición inline | [EVIDENCIA de código] estado `editing` (objeto único) en el raíz; `.map(tracks)` en el mismo componente; sin hijo memoizado | `src/app/(app)/calendario/[id]/tracklist/tracklist-editor.tsx:82,549,570` | [HIPÓTESIS] lag de tecleo en sets de 40–60 tracks en móvil; imperceptible en sets chicos | Extraer `<TrackRow>` `React.memo` con callbacks estables; edición local con commit al blur | medio |
| P-08 | **Alto** | Render | `profile-form`: `onChange` inline recreado a `AvatarUpload` + `form.gallery ?? []` (array nuevo por render); todo el form re-renderiza por tecla | [EVIDENCIA de código] `useState<DjProfile>` único; `:208` `onChange={(url)=>update(...)}`; `:262` `form.gallery ?? []` | `src/app/(app)/perfil/profile-form.tsx:37,208,262` | [HIPÓTESIS] costo moderado; sensible en `AvatarUpload`/`GallerySection` si hacen trabajo en render | `useCallback` para el `onChange`; no recrear el array inline; `React.memo` en los hijos pesados | bajo |
| P-09 | **Medio** | Backend/Logs (+privacidad) | Email de usuario **en claro** en logs de beta-invite (el resto del código usa `userIdShort` hasheado) | [EVIDENCIA] `console.log(... { email: opts.userEmail })` y `console.warn(... { userEmail, inviteEmail })` | `src/lib/queries/beta-invite.ts:128-131,167-171` | PII en logs de Vercel = costo de ingestión + exposición (relevante a Ley 21.719 en curso) | Loguear solo dominio o hash; consistente con `userIdShort` | muy bajo |
| P-10 | **Medio** | Bundle | **Cero `next/dynamic`/`React.lazy`** en todo el código → modales/editores grandes van en el bundle inicial | [EVIDENCIA] `grep next/dynamic` + `React.lazy` = 0; modales importados en `(app)/layout.tsx` | `nps-modal.tsx`, `feedback-widget.tsx`, `beta-expired-modal.tsx`, `subscription-required-modal.tsx`, `welcome-wizard.tsx`, `embeds.tsx`, `ai-panel.tsx` | Código que el usuario no abre al primer paint viaja en el initial bundle | `next/dynamic(() => import(...), { ssr:false })` en modales y componentes below-the-fold | bajo |
| P-11 | **Medio** | Bundle | `qrcode` (lib cliente) empaquetado en la ruta `/press-kit` aunque el QR esté tras un panel | [EVIDENCIA] `import QRCode from "qrcode"` en `"use client"`; chunk `2719 = 32 KB`; ruta 207 KB | `src/app/(app)/press-kit/share-tools.tsx:16`; `press-kit/page.tsx:168` | JS de QR carga en cada visita al press-kit propio | `next/dynamic` el `ShareTools`, o generar el QR server-side (ya existe `/api/tracklist/[id]/story.png` de precedente) | bajo |
| P-12 | **Medio** | Caché | `/eventos` (feed público) es `force-dynamic` sin capa de caché → 3 reads de BD por hit | [EVIDENCIA] `export const dynamic="force-dynamic"`; `getUpcomingPublicEvents` sin `unstable_cache` | `src/app/eventos/page.tsx:13`; `lib/queries/events.ts:150` | Reads idénticos repetidos bajo tráfico de crawlers/fans | `unstable_cache({revalidate:300, tags:["public-events"]})` o ISR `revalidate=300` (contenido no es por-usuario) | bajo |
| P-13 | **Medio** | Over-fetching | List views con `select('*')` y `.limit()` fijo sin paginación real; dashboard baja 1000 filas para mostrar 5 | [EVIDENCIA] `listContacts select('*').limit(1000)`; `dashboard/page.tsx:73` baja 1000 y `.slice(0,5)` en `:113` | `lib/queries/contacts.ts:97,126`; `discovered-leads.ts:7`; `campaigns.ts:29`; `dashboard/page.tsx:73,113` | Hasta 1000 filas completas transferidas para pintar una tabla; dashboard trae 200× lo que muestra | Paginación cursor/offset en CRM/leads/campañas; **`limit:5` en top-contactos del dashboard (quick win)** | medio |
| P-14 | **Medio** | Waterfall | `(app)/layout.tsx` ejecuta 5 `await` secuenciales en cada página autenticada | [EVIDENCIA] `getUser → consumeBetaInviteIfAny → dj_profile → getBetaState → getOrCreateSubscription` en serie | `src/app/(app)/layout.tsx:34-122` | Latencia serial al TTFB en cada navegación privada | Gatear `consumeBetaInviteIfAny` con once-guard (como `booker/layout.tsx:64-76`); paralelizar lo independiente | medio |
| P-15 | **Medio** | Backend/DB | `push/send-cron` N+1 sin cota (loop users × campañas × plataformas, cada uno con query) | [EVIDENCIA] `route.ts:268` loop users; `:118-131` loop anidado `platform_snapshots.maybeSingle()`; sin `LIMIT` en `:254` | `src/app/api/push/send-cron/route.ts:118-131,254,268` | O(users×campañas×plataformas) round-trips por corrida; `maxDuration=120s` es el techo | Traer snapshots recientes por user en 1 query agregada; paginar `push_subscriptions` | medio |
| P-16 | **Medio** | Backend/resiliencia | `fetch` sin timeout a countriesnow.space, Gmail send y Resend (webhook inbound) | [EVIDENCIA] `countries.ts:226`, `gmail/client.ts:212`, `resend/webhook/route.ts:54,164` sin `signal` | ídem | Función serverless pegada hasta el límite del route pagando duración muerta; Resend reintenta → amplificación | `AbortSignal.timeout(8_000)` en cada fetch a terceros | bajo |
| P-17 | **Medio** | Render/Red | Iframes SoundCloud/YouTube/Mixcloud **sin `loading="lazy"`** en el press kit; N `POST /api/track` al montar | [EVIDENCIA] `embeds.tsx:82-90/161-169/365-372` sin `loading`; Spotify/Beatport sí lo tienen (`:292,:418`) | `src/app/p/[slug]/embeds.tsx` | Players de terceros se descargan aunque estén fuera de viewport; N tracking POST al abrir el press kit | Añadir `loading="lazy"` a SC/YT/MC; disparar tracking con IntersectionObserver | bajo |
| P-18 | **Bajo** | Memoria | Listener `load` del script de Turnstile nunca se remueve (`removeEventListener` faltante) | [EVIDENCIA] `s.addEventListener("load", doRender)` sin cleanup del listener | `src/components/turnstile-widget.tsx:85` | Casi nulo; closures muertos minúsculos si el widget se re-monta mucho | `s?.removeEventListener("load", doRender)` en cleanup | muy bajo |
| P-19 | **Bajo** | Memoria | `setState` tras `await`/abort sin guard de desmontaje en `useOllamaStatus` y `push-setup` | [EVIDENCIA] `use-ollama.ts:22-26` `.then(setStatus)` sin chequear `signal.aborted`; `push-setup.tsx:25-35` sin flag | ídem | Warning "setState on unmounted" en dev; sin leak real (abort corta la red) | Guard `if (!controller.signal.aborted)` / flag `cancelled` | bajo |
| P-20 | **SIC** | Memoria | Patrón `setTimeout(()=>setX(false), N)` en handlers sin cleanup (~15 sitios: copy/toast) | [EVIDENCIA] muestra en `press-kit/copy-link-button.tsx:14`, `share-tools.tsx:85`, etc. | varios | Ninguno práctico (timers 1–3s, no se acumulan) | Opcional: hook `useCopyFeedback`; no vale tocar 15 archivos | bajo |
| P-21 | **Bajo** | Polling | Dashboards admin re-corren agregaciones pesadas por polling (trafico 15s, campañas/correo 30s) | [EVIDENCIA] `admin/trafico/live-refresher.tsx:13`; `getAnalyticsSnapshot` con scans secuenciales (`analytics.ts:27-125`) | ídem | Solo admins (bajo nº de viewers), visibility-gated → impacto absoluto bajo | Cachear la agregación server-side; subir intervalos; paralelizar `getAnalyticsSnapshot` | bajo |
| P-22 | **Bajo** | Logs | 114 `console.*` sin convención (89 error, 10 warn, 10 log) | [EVIDENCIA] `grep console. src \| wc -l` = 114; solo 2 en loops (condicionados a error) | src/ | Volumen de ingestión modesto; los errores son útiles | Logger con niveles para silenciar `console.log` en prod (coordinar con P-09) | bajo |
| P-23 | **Bajo** | Render | `beta-requests-table`: conteos de filtro `requests.filter().length` recomputados N×N; `toLocaleString` por fila por render | [EVIDENCIA] `:242` filter dentro del `.map` de botones; `:281` `new Date().toLocaleString` por fila | `src/app/(app)/admin/beta-requests/beta-requests-table.tsx:242,281` | Admin, volúmenes chicos → irrelevante bajo ~100 solicitudes | `useMemo` para los conteos; `<Row memo>` (ya tiene `key={r.id}`) | bajo |
| P-24 | **Bajo** | Render | `contact-form` / `post-form`: form re-renderiza por tecla (objeto único / 19 useState); hijos no memoizados | [EVIDENCIA de código] `contact-form.tsx:77,126`; `post-form.tsx:52-76,274` | ídem | [HIPÓTESIS] imperceptible (formularios cortos) | Opcional: `React.memo(MetricInput)` (props ya estables); no urge | bajo |
| P-25 | **Bajo** | Infra | Middleware = 144 KB y warning de Edge Runtime (Supabase usa `process.version`) | [EVIDENCIA] build `ƒ Middleware 144 kB` + warning de Node API en edge | `src/lib/supabase/middleware.ts` | Afecta cold-start/latencia de edge, no el First Load JS del cliente | Inherente al refresh de sesión Supabase; dejar salvo que la latencia sea un problema medido | alto (si se cambia) |
| P-26 | **Bajo** | Cliente/CPU | `landing-hero` corre un loop `requestAnimationFrame` continuo (canvas), sin pausar fuera de viewport | [EVIDENCIA] `:106-110` rAF loop; respeta `prefers-reduced-motion` (`:103`) | `src/components/public/landing/landing-hero.tsx:106-110` | Costo CPU/batería en cliente mientras el hero esté montado (no infra) | Pausar el rAF con IntersectionObserver cuando el hero sale de viewport | bajo |

### Hipótesis (requieren medición adicional)
| # | Área | Hipótesis | Cómo confirmar |
|---|---|---|---|
| H-01 | BD/índices | El filtro `account_status = 'active'` (queries públicas calientes) no está cubierto por índice: el único índice de `account_status` es **parcial** `WHERE account_status <> 'active'` (migración 0030) | `EXPLAIN ANALYZE` de `getProfileBySlug`, `getPublicDjsBase`; añadir índice solo si el planner hace scan |
| H-02 | Backend/crons | Otros patrones secuenciales por-ítem: `onboarding-nudge` `getUserById` por candidato; `integrations/sync-job` API por cuenta; `calendar/sync-job` insert/update por evento vs bulk | Batch jobs (no latencia de usuario), acotados; medir duración de función en Vercel |
| H-03 | Web Vitals | `FCP ≈ 2.6 s` en home (medido) sugiere hero pintado por JS de cliente tras hidratar → LCP potencialmente alto | Lighthouse móvil throttled (4G + CPU 4×) en `/`; capturar LCP/INP reales |
| H-04 | Fuentes | `Space_Mono` trae pesos 400+700; confirmar que el 700 se usa | Auditar clases `font-mono font-bold`; quitar peso ahorra ~15 KB |

---

## 3. Auditoría de Client/Server Components (Next.js App Router)

**[EVIDENCIA]**
- **Ningún `page.tsx`/`layout.tsx` es `"use client"`** — los 123 archivos cliente son componentes hoja. Boundaries **correctamente** ubicados. No hay "layout entero convertido en cliente".
- **Sin props no serializables** cruzando Server→Client (no se pasan funciones, Dates ni instancias de clase; el cliente Supabase se crea *dentro* de cada lado, nunca como prop).
- **`mercadopago`, `web-push`, `resend` son server-only** (`import "server-only"`), no entran al bundle cliente. La única lib cliente pesada es `qrcode` (P-11).
- **`lucide-react`**: 125 archivos, 80 iconos distintos, todos import nombrado desde `"lucide-react"` → tree-shaking OK vía `optimizePackageImports` de Next 15 (no está deshabilitado). **Sin problema.**

**Problemas:** P-01, P-02 (Supabase en bundle), P-10 (sin lazy loading), P-11 (qrcode). Data fetching en cliente (`gated-contact.tsx`) es **decisión de privacidad intencional** (contacto nunca en el HTML público) — se deja.

---

## 4. Auditoría de fetching, APIs y base de datos

**Lo que YA está bien [EVIDENCIA]:**
- **`/p/[slug]` (press kit) ya está optimizado:** 4 fuentes en `Promise.all` + timeout de Bandcamp (`withTimeout(...,5000,[])`) + ISR `revalidate=60`. **Medición prod confirma TTFB 58 ms** (cache hit ISR).
- **Middleware ya salta `getUser()`** en rutas públicas (crawlers, pixels, webhooks) — `middleware.ts:72-74`.
- **`/dj` usa `unstable_cache` (300s)** con todos los filtros en memoria; `/dj/ciudad|genero` son ISR 1h.
- **Batching correcto** (sin N+1) en feeds de booker, favoritos, DJs interesados, pitches, follow-feed y eventos (`.in()` único).
- **Indexado sólido:** compuestos `contacts(user_id,status/type/score)`, GIN en tags, índices parciales de directorio/presencia/pagos, `booking_form_submissions.view_token` único.

**Problemas:** P-03 (`getUser()` sin `cache()` — el mayor de esta área), P-04 (heartbeat 3 round-trips), P-05 (N+1 follow-updates), P-12 (`/eventos` sin caché), P-13 (over-fetch/paginación), P-14 (waterfall del layout), P-15 (push-cron N+1). Hipótesis: H-01.

---

## 5. Auditoría de memoria y limpieza de procesos

**[EVIDENCIA] — En esta dimensión la app está limpia. Sin hallazgos Crítico/Alto.**
- **No hay realtime de Supabase** en todo el codebase (`grep .channel/.on/postgres_changes` = 0). Las features "en vivo" son polling + `router.refresh()`. → No existe la clase de leak de canales sin `removeChannel`.
- **Los 3 `URL.createObjectURL` tienen su `revokeObjectURL`** (share-tools, evento-manager, export-button). Previews de avatar/galería usan `FileReader`/data-URL (no requieren revoke).
- **Todos los `setInterval`/observers/rAF de los archivos clave limpian** en el cleanup del `useEffect` (heartbeat 60s, auto-refresh 30s, live-refresher 15s, use-ollama 30s, landing-hero 3s + ResizeObserver + rAF).
- **`rate-limit.ts` NO es un leak:** Map module-level con eviction cada 1000 inserts + reset en cold start (documentado honestamente en el propio archivo).

**Problemas:** P-18 (Turnstile listener), P-19 (setState post-unmount), P-20 (SIC). Ver tabla completa de timers/listeners en el Anexo A.

---

## 6. Auditoría de bundles y dependencias

**[EVIDENCIA] — `next build` real (Next 15.5.19):**

```
First Load JS shared by all = 182 kB
  ├ chunks/4bd1b696…js   54.2 kB   (React / framework)
  ├ chunks/6101…js       126 kB    (runtime React DOM + Next.js — NO Supabase; ver corrección de P-01)
  └ other shared          2.16 kB
ƒ Middleware = 144 kB                                                        ← P-25
```

| Ruta | Tamaño ruta | **First Load JS** |
|---|---|---|
| `/configuracion` | 22.7 kB | **283 kB** |
| `/perfil` | 11.7 kB | **274 kB** |
| `/signup/booker` | 7.21 kB | **264 kB** |
| `/login` | 6.41 kB | **262 kB** |
| `/auth/forgot-password` | 4.62 kB | **260 kB** |
| `/p/[slug]` (press kit público) | 8.83 kB | **208 kB** |
| `/press-kit` | 15.1 kB | **207 kB** |
| `/crm/[id]` | 15.1 kB | 214 kB |
| `/calendario/[id]/tracklist` | 11.7 kB | 204 kB |

**Dependencias:** sanas y mínimas. Heaviest en `dependencies` que **sí** se envían: Supabase (el chunk 6101). `@sentry` (68 MB en disco) se tree-shakea; `lucide-react` (36 MB fuente) envía solo los 80 iconos usados. `typescript/babel/playwright/eslint` son devDeps (no se envían). **Sin dependencias sin uso ni duplicadas detectadas.**

**Problemas:** P-01, P-02, P-10, P-11. `lucide` OK (P-... n/a).

---

## 7. Auditoría de imágenes, fuentes y multimedia

**[EVIDENCIA] — Bien optimizado, sin hallazgos de peso:**
- `public/` total **< 1 MB**; sin GIF/MP4/imágenes gigantes. `og.png` = 64 KB. Las 7 capturas de `landing/product` (70–123 KB) se sirven vía `next/image` con `fill`+`sizes` → AVIF/WebP.
- **`next/image` bien configurado:** `formats:["avif","webp"]`, `qualities:[85,90]`, `minimumCacheTTL: 2678400` (31 días, corta egress de Storage), `remotePatterns` acotado a Supabase.
- **Fuentes:** 4 familias vía `next/font`, todas usadas, todas con `display:"swap"`, subset `latin`. Satoshi local **24 KB woff2** (peso 900 único). No hay carga desde múltiples proveedores ni fuentes bloqueantes. Única micro-optimización posible: H-04 (peso 700 de Space_Mono).
- **Landing hero:** es canvas 2D + SVG (no video/gif), respeta `prefers-reduced-motion`. Único matiz: P-26 (rAF continuo).

**Problema relacionado:** P-17 (iframes de embeds sin `lazy`).

---

## 8. Auditoría del estado global

**[EVIDENCIA] — Sin problemas.** No hay store global (Redux/Zustand) ni contextos amplios. Solo 3 archivos tocan `Provider`/`createContext` (layouts + confirm-dialog). No hay "componentes suscritos a todo el store" ni "context recreado en cada render". La persistencia en `localStorage`/`sessionStorage` es puntual. **Dimensión sana.**

---

## 9. Auditoría del backend y consumo de infraestructura

**[EVIDENCIA] — Cron (disparados por GitHub Actions, todos con `CRON_SECRET`):**

| Cron | Workflow | Schedule (UTC) | Trabajo |
|---|---|---|---|
| gmail/sync-cron | `sync-calendar.yml` | `0 * * * *` (cada hora) | Sync Google Calendar de todos los users conectados |
| beta/expire-cron | `expire-beta.yml` | `0 12 * * *` | Expira betas +15d + emails |
| growth/sync-cron | `sync-growth.yml` | `0 12 * * *` | Scrape SoundCloud/YouTube |
| push/send-cron | `push-daily.yml` | `0 13 * * *` | 7 triggers por user (P-15) |
| follow-updates/cron | `follow-updates.yml` | `0 13 * * *` | Digest a followers (P-05) |
| onboarding-nudge/cron | `onboarding-nudge.yml` | `0 14 * * *` | **DORMIDO** (dry-run) |
| pulso/cron | `pulso-weekly.yml` | `0 13 * * 1` | **DORMIDO** (dry-run) |

> Nota: `0 12` (×2) y `0 13` (×3) disparan varios crons al mismo minuto → posible contención de concurrencia de funciones. [HIPÓTESIS de impacto; medir en Vercel].

**Lo que YA está bien [EVIDENCIA]:** webhooks MP y Resend con **firma verificada + idempotencia** (MP: HMAC SHA-256 `timingSafeEqual`, fail-closed, upsert por `mp_payment_id`; Resend: HMAC Svix + anti-replay ±5 min). MP SDK con timeout 5s. Overpass con failover de 4 mirrors + timeout 45s + rate-limit + cota de tamaño. Scraping SC/YT con timeout 15s.

**Problemas:** P-06 (Google Calendar sin timeout — Alto), P-09 (PII en logs), P-15 (push-cron N+1), P-16 (timeouts faltantes), P-22 (logs), P-25 (middleware edge warning). Hipótesis: H-02.

---

## 10. Auditoría del navegador (evidencia dinámica — rutas públicas prod)

Medición con Playwright (navegador aislado, **desktop sin throttling, navegador frío**). No es Lighthouse de campo; es *baseline* direccional.

| Métrica | `/` (home) | `/p/nova-rios-demo` (press kit) |
|---|---|---|
| TTFB | 496 ms | **58 ms** (ISR cache hit ✓) |
| DOMContentLoaded | 1619 ms | — |
| Load | 1771 ms | 2498 ms |
| FCP | **2592 ms** ⚠ | 2036 ms |
| LCP | no capturado (ver límites) | no capturado |
| CLS | **0** ✓ | **0** ✓ |
| Requests | 27 | 29 |
| Transferencia total | 377 KB | 34 KB* |
| JS (transferido) | **215 KB** (11 archivos) | * |

- **JS dominante en home [EVIDENCIA, corregido]:** `6101…js = 123 KB` = **runtime React DOM + Next.js** (framework, NO Supabase — ver corrección de P-01) + `4bd1b696…js = 55 KB` (React). La home pública **NO** carga el cliente Supabase (chunk `1613`, presente solo en rutas privadas/auth).
- `*` La transferencia del press kit (34 KB) está **subestimada por caché caliente** (los chunks JS se reutilizaron de la visita a home). En frío, `/p/[slug]` = 208 KB First Load (build). La cuenta demo NOVA RÍOS no tiene embeds, así que esa página no ejercita P-17.
- **CLS 0 en ambas** → sin layout shifts (bien). **FCP ~2.6 s en home** [HIPÓTESIS H-03]: sugiere hero pintado por JS de cliente tras hidratar; medir LCP con Lighthouse móvil throttled.
- **Long tasks / main-thread blocking / INP:** no medidos (requieren trace de Chrome DevTools, bloqueado por perfil en uso).

---

## Resumen ejecutivo (lenguaje simple)

**¿Qué consume más recursos?**
1. ~~El JavaScript de Supabase se descarga en todas las páginas~~ **(CORREGIDO — falso positivo).** Verificado empíricamente: el chunk grande compartido (126 KB) es el **runtime de React DOM + Next.js** (framework, inevitable), NO Supabase. El cliente Supabase solo carga en las 7 rutas privadas/auth que realmente lo usan. **No hay desperdicio de bundle en las páginas públicas.**
2. **Cada navegación dentro del área privada dispara 2–5 verificaciones de sesión** contra Supabase, porque la función que obtiene el usuario no está cacheada por request. Suma latencia y carga innecesaria.
3. **Un cron horario (Google Calendar) puede quedarse "colgado"** por falta de timeout y pagar hasta 60 s de función, además de bloquear el sync del resto de usuarios.

**¿Qué problemas son reales (evidencia)?** P-01, P-02, P-03, P-04, P-05, P-06, P-09 y todo el bloque de bundle/caché/backend con `archivo:línea`. Están medidos o leídos directamente en el código.

**¿Qué es solo potencial (hipótesis)?** El impacto de los re-renders de los editores del área privada (P-07/P-08) — es real en el código pero no pude medir su magnitud sin login. Los índices de BD (H-01), otros crons (H-02) y el LCP móvil (H-03).

**¿Qué corregir primero?** En orden de retorno/riesgo: **P-03** (cache de `getUser`, 1 helper), **P-06** y **P-16** (timeouts, 1 línea c/u), **P-09** (PII en logs), **P-05** (N+1), luego **P-01/P-02** (el gran lever de bundle, más cuidado).

**¿Qué mejora esperar?**
- Baseline de JS público de **182 KB → ~60–90 KB** si se saca el cliente Supabase de las rutas públicas (P-01) → FCP/LCP y egress mejores para todo visitante anónimo.
- TTFB de páginas privadas: **−1 a −4 round-trips de auth** por navegación (P-03/P-14).
- Costo/estabilidad de funciones serverless: eliminar duración muerta por timeouts (P-06/P-16).
- **Nada de esto cambia funcionalidad ni seguridad.**

---

## Top 10 de problemas (por impacto × esfuerzo)

| # | Problema | Prioridad | Esfuerzo | Retorno |
|---|---|---|---|---|
| 1 | P-03 `getUser()` sin `cache()` (round-trips de auth) | Alto | **S** | Alto |
| 2 | ~~P-01 Supabase en baseline de todas las rutas~~ **DESCARTADO** (verificado: era framework React/Next, no Supabase) | — | — | — |
| 3 | P-06 Google Calendar sin timeout en cron horario | Alto | **S** | Alto |
| 4 | P-05 N+1 en cron follow-updates | Alto | **S** | Medio-Alto |
| 5 | P-09 Email PII en logs | Medio (Alto priv.) | **S** | Medio |
| 6 | P-16 Timeouts faltantes (countriesnow/Gmail/Resend) | Medio | **S** | Medio |
| 7 | P-13 Dashboard baja 1000 filas para mostrar 5 (+paginación) | Medio | **S** (dashboard) | Medio |
| 8 | P-12 `/eventos` sin caché | Medio | **S** | Medio |
| 9 | P-10 Sin `next/dynamic` (modales/editores eager) | Medio | **M** | Medio |
| 10 | P-07 `tracklist-editor` re-render por tecla | Alto | **M** | Medio (área privada) |

---

## Quick wins (bajo riesgo, alto/medio retorno)

- **P-03** — helper `getCurrentUser = cache(...)` y reemplazar los `getUser()` del request. *(S, riesgo bajo)*
- **P-06 / P-16** — añadir `AbortSignal.timeout(...)` a los fetch externos sin timeout. *(S, riesgo bajo)*
- **P-09** — dejar de loguear el email completo en beta-invite. *(S, riesgo muy bajo)*
- **P-05** — reemplazar el loop por un `.in()`. *(S, riesgo bajo)*
- **P-13 (dashboard)** — `limit: 5` en la llamada de top-contactos. *(S, riesgo bajo)*
- **P-12** — envolver `getUpcomingPublicEvents` en `unstable_cache`. *(S, riesgo bajo)*
- **P-17** — `loading="lazy"` en iframes SC/YT/MC. *(S, riesgo bajo)*
- **P-18** — `removeEventListener` del script de Turnstile. *(XS, riesgo muy bajo)*

## Refactorizaciones mayores (más cuidado / dependencias)

- **P-01 / P-02** — reestructurar el grafo del cliente Supabase para que las rutas públicas no lo carguen; requiere verificar que realtime no se usa y probar login/refresh de sesión (con el CAPTCHA/Turnstile de por medio). *(M–L, riesgo medio)*
- **P-07 / P-08** — extraer subcomponentes memoizados de los editores grandes; idealmente **con tests antes** (la auditoría previa T-5 marcó "cero tests"). *(M, riesgo medio)*
- **P-15** — reescribir la agregación del `push/send-cron` a queries batched. *(M, riesgo medio)*
- **P-14** — reordenar/paralelizar el layout autenticado sin romper el gating de auth. *(M, riesgo medio)*

## Archivos más problemáticos (concentran hallazgos)

1. `src/lib/supabase/{client,server,middleware}.ts` — P-01, P-03, P-04, P-25.
2. `src/app/(app)/layout.tsx` — P-14 (+ toca P-03).
3. `src/app/(app)/calendario/[id]/tracklist/tracklist-editor.tsx` — P-07.
4. `src/app/(app)/perfil/profile-form.tsx` — P-08.
5. `src/lib/calendar/sync-job.ts` — P-06.
6. `src/app/api/{follow-updates,push}/…cron/route.ts` — P-05, P-15.
7. `src/app/p/[slug]/embeds.tsx` — P-17.
8. `src/lib/queries/beta-invite.ts` — P-09.

---

## Plan de corrección (por etapas) — resumen

Detalle ejecutable en `PERFORMANCE_ACTION_PLAN_DROP.md`.

1. **Críticas:** ninguna (no hay hallazgos Críticos).
2. **Alto impacto / bajo riesgo:** P-03, P-06, P-16, P-05, P-09, P-13(dashboard), P-12.
3. **Optimización de render:** P-07, P-08, P-17, P-23, P-24.
4. **Optimización de fetching:** P-04, P-14, P-15, P-13(paginación), H-01 (medir).
5. **Bundle y assets:** P-01, P-02, P-10, P-11, P-26, H-04.
6. **Backend/infra:** P-22 (logger), P-25 (monitorear), contención de crons.
7. **Monitoreo posterior:** ver "Métricas antes/después".

---

## Métricas antes y después (qué medir)

**Baseline "antes" capturado (2026-07-06):**
- Bundle: shared **182 KB** (framework React/Next — 126 KB `6101` + 54 KB React; **NO** Supabase) · middleware **144 KB** · `/perfil` 274 KB · `/login` 262 KB · `/p/[slug]` 208 KB.
- Home prod (desktop, frío): TTFB **496 ms**, Load **1771 ms**, FCP **2592 ms**, CLS **0**, JS **215 KB**, transferencia **377 KB**.
- Press kit prod: TTFB **58 ms** (ISR), CLS **0**.

**Qué medir después de cada cambio:**
| Métrica | Herramienta | Objetivo direccional |
|---|---|---|
| First Load JS shared | `next build` | 182 KB → **< 100 KB** en rutas públicas (P-01) |
| First Load JS `/login`, `/perfil` | `next build` | reducir el doble chunk Supabase (P-02) |
| Nº de renders del editor | React Profiler (requiere login) | tracklist: re-render solo de la fila editada (P-07) |
| Round-trips `auth.getUser()` / navegación | logs Supabase / trace | 2–5 → **1** por request (P-03) |
| Requests / transferencia | Chrome Network / Playwright | menos JS público; menos POST /api/track (P-17) |
| TTFB páginas privadas | Server-Timing / Vercel | bajar por menos waterfall (P-03/P-14) |
| LCP / INP / CLS | Lighthouse móvil throttled + RUM (Vercel/Web Vitals) | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 (H-03) |
| Duración de funciones (crons/API) | Vercel Functions | eliminar picos por timeout (P-06/P-16) |
| Consultas a BD por corrida de cron | Supabase logs | N+1 → 1 batched (P-05/P-15) |
| Volumen de logs / PII | Vercel logs | 0 PII en logs (P-09) |
| Costo infra (funciones/egress/BD) | Vercel + Supabase billing | tendencia a la baja |

---

## Anexo A — Tabla de timers / listeners / observers (todos con cleanup salvo P-18)

| Archivo:línea | Tipo | Intervalo/gatillo | Cleanup |
|---|---|---|---|
| `components/dj/presence-heartbeat.tsx:23` | setInterval (POST heartbeat) | 60 s | ✅ |
| `admin/email-campaigns/auto-refresh.tsx:13` | setInterval (`router.refresh`) | 30 s | ✅ |
| `admin/trafico/live-refresher.tsx:17` | setInterval (`router.refresh`) | 15 s | ✅ |
| `lib/ai/use-ollama.ts:31` | setInterval (re-check) | 30 s | ✅ |
| `landing-hero.tsx:50` | setInterval (cross-dissolve) | 3 s | ✅ |
| `landing-hero.tsx:86` | ResizeObserver | resize | ✅ |
| `landing-hero.tsx:110` | requestAnimationFrame | rAF | ✅ |
| `public/reveal.tsx:33`, `funcionalidades-section.tsx:33` | IntersectionObserver | scroll | ✅ |
| `turnstile-widget.tsx:85` | addEventListener `load` (script) | evento | ❌ **P-18** |
| `avatar-lightbox.tsx:37`, `mobile-menu.tsx:96/106`, `confirm-dialog.tsx:101`, `gallery-grid.tsx:35`, `header-profile-menu.tsx:34-35` | addEventListener (keydown/mousedown) | evento | ✅ |
| `push/client.ts:73/109` | pushManager subscribe/unsubscribe | acción | ✅ (balanceado) |
| ~15× `setTimeout(setX(false), N)` (copy/toast) | setTimeout | 1–3 s | ❌ (SIC, P-20) |

**Realtime Supabase:** 0 suscripciones en todo el codebase (confirmado). **`URL.createObjectURL`:** 3/3 revocados.

---

## Anexo B — Restricciones respetadas
- ❌ Sin cambios en producción · ❌ sin modificar la "segunda app" (no existe) · ❌ sin cambiar funcionalidad · ❌ sin eliminar dependencias · ❌ sin `useMemo`/`useCallback`/`memo` indiscriminado (solo donde hay evidencia) · ❌ sin asumir que todo render es problema · ❌ sin reducir seguridad · ❌ sin cambiar reglas de negocio · ❌ sin cambios de esquema de BD (H-01 solo propone medir) · ✅ evidencia vs hipótesis separadas · ✅ sin inventar resultados de profiling.
