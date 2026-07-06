# PERFORMANCE_ACTION_PLAN_DROP — Plan ejecutable

- **App:** DROP. (`dropgigs.com`) · repo `jayportu_Manager_OS/`
- **Basado en:** `PERFORMANCE_AUDIT_DROP.md` (2026-07-06)
- **Regla:** **no implementar hasta aprobación de Jaime.** Cada tarea es pequeña, aislada y reversible. No cambia funcionalidad, seguridad ni reglas de negocio.
- **Contexto de riesgo del repo:** `.env.local` apunta a Supabase de **producción**; login local bloqueado por CAPTCHA/Turnstile; "cero tests automatizados" según auditoría previa (T-5). Por eso las tareas de render (que no se pueden probar sin login) se agrupan aparte y se recomienda suite de tests antes.

**Leyenda de esfuerzo:** XS (<30 min) · S (≤2 h) · M (medio día) · L (varios días).

---

## ETAPA 0 — Preparación (habilitar verificación)

### T0.1 — Establecer baseline reproducible
- **Prioridad:** previa · **Esfuerzo:** S · **Riesgo:** ninguno
- **Archivo:** ninguno (comandos)
- **Cambio:** guardar salida de `npm run build` (tabla de rutas) y correr Lighthouse móvil throttled sobre `https://dropgigs.com/` y `/p/[slug]` demo. Registrar shared JS, First Load por ruta, LCP/INP/CLS.
- **Dependencias:** ninguna.
- **Prueba:** que los números coincidan con el baseline del audit (§Métricas).
- **Criterio de aceptación:** documento `perf-baseline-YYYYMMDD.md` con métricas "antes".
- **Métrica:** todas (línea base).

### T0.2 — (Recomendado) Suite mínima de tests antes de tocar render
- **Prioridad:** previa a Etapa 3 · **Esfuerzo:** M · **Riesgo:** nulo (aditivo)
- **Cambio:** tests de humo de los editores (`tracklist-editor`, `profile-form`) y de las queries clave; e2e público Playwright ya existe.
- **Dependencias:** —
- **Prueba:** `npm run test:unit` verde.
- **Criterio:** los editores tienen al menos un test de "guardar sin perder datos".
- **Métrica:** habilita medir "nº de renders" sin regresiones.

---

## ETAPA 1 — Alto impacto / bajo riesgo (quick wins de backend y auth)

### T1.1 — Cachear `getUser()` por request (P-03)
- **Prioridad:** Alto · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/lib/supabase/server.ts` (+ call sites en `lib/queries/*`, `(app)/layout.tsx`)
- **Cambio:** crear `export const getCurrentUser = cache(async () => (await createClient()).auth.getUser())` (React `cache`, scope por request) y reemplazar los `supabase.auth.getUser()` repetidos dentro de un mismo render. **No** tocar el del middleware (vive en otro runtime/request).
- **Dependencias:** ninguna.
- **Prueba:** navegar el área privada (staging o con login desbloqueado) y verificar en logs de Supabase Auth que baja el nº de llamadas `/user` por navegación; verificar que rol/gating siguen correctos.
- **Criterio de aceptación:** 1 sola verificación de usuario por request (fuera del middleware); sin regresión de permisos.
- **Métrica:** round-trips `auth.getUser()` por navegación (2–5 → 1); TTFB privado.

### T1.2 — Timeout en fetch a Google Calendar del cron horario (P-06)
- **Prioridad:** Alto · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/lib/calendar/sync-job.ts:62,97`
- **Cambio:** añadir `signal: AbortSignal.timeout(10_000)` a ambos `fetch`; envolver el catch para que un timeout no aborte el batch. (Fase 2 opcional: `Promise.allSettled` con concurrencia acotada en `syncEventsForAllUsers:198`.)
- **Dependencias:** ninguna.
- **Prueba:** simular endpoint lento (mock) en test unit del helper; confirmar que resuelve/omite en ≤10 s.
- **Criterio de aceptación:** ningún `fetch` del sync puede colgar > 10 s; el fallo de un user no bloquea a los demás.
- **Métrica:** duración de la función `gmail/sync-cron` (p95) en Vercel.

### T1.3 — Timeouts en countriesnow / Gmail send / Resend inbound (P-16)
- **Prioridad:** Medio · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/lib/geo/countries.ts:226`, `src/lib/gmail/client.ts:212`, `src/app/api/resend/webhook/route.ts:54,164`
- **Cambio:** `signal: AbortSignal.timeout(8_000)` en cada fetch a terceros.
- **Dependencias:** ninguna.
- **Prueba:** unit test con endpoint que no responde; confirmar degradación limpia (`[]`/error controlado).
- **Criterio de aceptación:** ningún fetch externo cuelga la función hasta `maxDuration`.
- **Métrica:** duración de funciones afectadas; tasa de reintentos de Resend.

### T1.4 — Quitar email PII de logs de beta-invite (P-09)
- **Prioridad:** Medio (Alto para privacidad) · **Esfuerzo:** S · **Riesgo:** muy bajo
- **Archivo:** `src/lib/queries/beta-invite.ts:128-131,167-171`
- **Cambio:** loguear solo dominio o hash del email (reusar patrón `userIdShort`), nunca el correo entero.
- **Dependencias:** ninguna (coordinable con T6.1).
- **Prueba:** buscar en logs de Vercel tras un flujo de invite → 0 correos en claro.
- **Criterio de aceptación:** ningún email completo en logs.
- **Métrica:** ocurrencias de PII en logs (→ 0); relevante para Ley 21.719.

### T1.5 — Eliminar N+1 en cron follow-updates (P-05)
- **Prioridad:** Alto · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/app/api/follow-updates/cron/route.ts:199-208`
- **Cambio:** reemplazar el loop por `.in("dj_user_id", djIds).eq("notify_email", true)` y agrupar en memoria (usa `idx_booker_favorites_dj_notify`).
- **Dependencias:** ninguna.
- **Prueba:** unit test del agrupado; comparar salida antes/después con datos ficticios.
- **Criterio de aceptación:** 1 query en vez de N; mismo resultado de digests.
- **Métrica:** nº de queries por corrida (N → 1).

### T1.6 — Dashboard: limitar top-contactos a 5 (P-13 parte quick)
- **Prioridad:** Medio · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/app/(app)/dashboard/page.tsx:73,113`
- **Cambio:** pasar `limit: 5` a `listContacts({ orderBy:'score' })` en vez de traer hasta 1000 y `.slice(0,5)`.
- **Dependencias:** que `listContacts` acepte `limit` (ya lo hace vía `.limit()`).
- **Prueba:** dashboard muestra los mismos 5 top contactos.
- **Criterio de aceptación:** la query trae ≤5 filas.
- **Métrica:** filas transferidas por carga de dashboard (1000 → 5).

### T1.7 — Cachear el feed público `/eventos` (P-12)
- **Prioridad:** Medio · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/app/eventos/page.tsx:13`, `src/lib/queries/events.ts:150`
- **Cambio:** envolver `getUpcomingPublicEvents` en `unstable_cache({ revalidate:300, tags:["public-events"] })`, o cambiar la página a ISR (`export const revalidate = 300`) quitando `force-dynamic` (contenido no es por-usuario). Invalidar tag al crear/editar evento público si se usa `unstable_cache`.
- **Dependencias:** revisar que no dependa de `cookies()`/sesión (es público).
- **Prueba:** medir TTFB de `/eventos` en frío vs cacheado; verificar que un evento nuevo aparece tras ≤5 min.
- **Criterio de aceptación:** reads de BD por hit anónimo tienden a 0 (cache hit); TTFB comparable a `/dj`.
- **Métrica:** TTFB `/eventos`; reads de BD por request.

---

## ETAPA 2 — Bundle y assets

### T2.1 — Sacar el cliente Supabase del baseline de rutas públicas (P-01)
- **Prioridad:** Alto · **Esfuerzo:** M–L · **Riesgo:** medio
- **Archivo:** `src/lib/supabase/client.ts`; consumidores en páginas públicas; `topbar.tsx:65`
- **Cambio:** (1) **Confirmar que Supabase Realtime NO se usa** (grep ya dio 0). (2) Asegurar que las páginas públicas (`/`, `/p/[slug]`, `/dj`, `/eventos`) no arrastren `createBrowserClient` en su grafo cliente (mantener reads en servidor). (3) Evaluar `import` dinámico del browser client solo donde se necesita (login, avatar upload).
- **Dependencias:** T1.1 (entender los call sites de auth) recomendable antes.
- **Prueba:** `next build` y comparar First Load JS de rutas públicas; **probar login + refresh de sesión + upload de avatar** (ojo CAPTCHA/Turnstile). Medición dinámica: home ya no baja el chunk `6101`.
- **Criterio de aceptación:** shared/First Load de rutas públicas cae ~120 KB; login/sesión intactos.
- **Métrica:** shared JS (182 KB → objetivo <100 KB en públicas).

### T2.2 — Reducir el doble chunk de auth en login/signup/reset (P-02)
- **Prioridad:** Alto · **Esfuerzo:** M · **Riesgo:** medio
- **Archivo:** `src/app/login/login-form.tsx`, `auth/*`, `signup/booker/booker-signup-form.tsx`
- **Cambio:** tras T2.1, verificar deduplicación del grafo Supabase; evaluar mover reset/signup a **server actions** (el cliente solo hace fetch fino, no carga GoTrue completo). Solo si no complica el flujo Turnstile.
- **Dependencias:** T2.1.
- **Prueba:** `next build` (First Load de `/login`, `/auth/*`); e2e de login/reset.
- **Criterio de aceptación:** First Load de auth < 200 KB; flujos intactos.
- **Métrica:** First Load `/login`, `/signup/booker`.

### T2.3 — Lazy-load de modales y componentes below-the-fold (P-10)
- **Prioridad:** Medio · **Esfuerzo:** M · **Riesgo:** bajo
- **Archivo:** `(app)/layout.tsx` (modales), `src/app/p/[slug]/embeds.tsx`, `crm/[id]/ai-panel.tsx`, `welcome/welcome-wizard.tsx`
- **Cambio:** `next/dynamic(() => import(...), { ssr:false })` para `nps-modal`, `feedback-widget`, `beta-expired-modal`, `subscription-required-modal`, embeds y AI panel.
- **Dependencias:** ninguna.
- **Prueba:** que los modales sigan abriéndose; `next/build` muestra chunks separados; sin regresión visual.
- **Criterio de aceptación:** el código de modales no está en el chunk inicial de las rutas que los montan.
- **Métrica:** First Load de rutas con modales.

### T2.4 — `qrcode` fuera del bundle del press-kit (P-11)
- **Prioridad:** Medio · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/app/(app)/press-kit/share-tools.tsx:16`, `press-kit/page.tsx:168`
- **Cambio:** `next/dynamic` el `ShareTools` (o solo el sub-panel del QR), o generar el QR server-side como endpoint PNG/data-URL.
- **Dependencias:** ninguna.
- **Prueba:** QR se genera al abrir el panel; ruta `/press-kit` más liviana en build.
- **Criterio de aceptación:** `qrcode` no viaja en el First Load de `/press-kit`.
- **Métrica:** First Load `/press-kit` (207 KB → menor).

### T2.5 — `loading="lazy"` en iframes SC/YT/MC (P-17)
- **Prioridad:** Medio · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/app/p/[slug]/embeds.tsx:82-90,161-169,365-372`
- **Cambio:** añadir `loading="lazy"` (igualar a Spotify/Beatport). Opcional: disparar el `POST /api/track` con IntersectionObserver al entrar en viewport en vez de al montar.
- **Dependencias:** ninguna.
- **Prueba:** con un DJ con embeds (no la demo), medir requests de terceros al abrir el press kit → los fuera de viewport no cargan hasta scroll.
- **Criterio de aceptación:** iframes fuera de viewport no descargan players al inicio.
- **Métrica:** requests/transferencia inicial de `/p/[slug]` con embeds.

### T2.6 — (Menor) Pausar rAF del hero fuera de viewport (P-26) y revisar peso 700 de Space_Mono (H-04)
- **Prioridad:** Bajo · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/components/public/landing/landing-hero.tsx:106-110`; `src/app/layout.tsx`
- **Cambio:** IntersectionObserver para pausar el loop cuando el hero sale de viewport; auditar si `font-mono font-bold` (peso 700) se usa; si no, quitar el peso.
- **Prueba:** el hero se pausa al hacer scroll; el sitio se ve igual sin el peso 700.
- **Criterio:** menos CPU en background; ~15 KB menos de fuente si aplica.
- **Métrica:** CPU en idle (DevTools Performance); peso de fuentes.

---

## ETAPA 3 — Optimización de render (área privada — requiere login para verificar)

> Preferible tras T0.2 (tests). Todos son **[HIPÓTESIS]** de impacto: reales en código, magnitud no medida.

### T3.1 — `tracklist-editor`: fila memoizada (P-07)
- **Prioridad:** Alto · **Esfuerzo:** M · **Riesgo:** medio
- **Archivo:** `src/app/(app)/calendario/[id]/tracklist/tracklist-editor.tsx`
- **Cambio:** extraer `<TrackRow>` `React.memo` recibiendo `track`, `isEditing`, `editValue` y callbacks estables (`useCallback`); o edición local por fila con commit al blur.
- **Dependencias:** cuidar el D&D que depende de `tracks`.
- **Prueba:** React Profiler (con login) — al tipear, solo re-renderiza la fila editada; guardar/reordenar/CSV import intactos.
- **Criterio de aceptación:** re-render acotado a la fila; sin regresión funcional.
- **Métrica:** nº de componentes re-renderizados por tecla (N filas → 1).

### T3.2 — `profile-form`: estabilizar callbacks y no recrear arrays (P-08)
- **Prioridad:** Alto (fix bajo riesgo) · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `src/app/(app)/perfil/profile-form.tsx:208,262`
- **Cambio:** `useCallback` para `onChange` de `AvatarUpload`; no pasar `form.gallery ?? []` inline (pasar `form.gallery` y default dentro del hijo); `React.memo` en `AvatarUpload`/`GallerySection`.
- **Dependencias:** ninguna.
- **Prueba:** Profiler — tipear en bio ya no re-renderiza avatar/galería; guardar perfil intacto.
- **Criterio de aceptación:** hijos pesados no re-renderizan al tipear en campos no relacionados.
- **Métrica:** re-renders de `AvatarUpload`/`GallerySection` por tecla (→ 0).

### T3.3 — (Bajo) `beta-requests-table`, `contact-form`, `post-form` (P-23, P-24)
- **Prioridad:** Bajo · **Esfuerzo:** S · **Riesgo:** bajo
- **Archivo:** `admin/beta-requests/beta-requests-table.tsx:242,281`; `crm/contact-form.tsx`; `growth/posts/post-form.tsx:274`
- **Cambio:** `useMemo` para conteos por estado (O(N) en vez de N×N); `<Row memo>`; `React.memo(MetricInput)`. **Solo si sobra tiempo** — impacto real bajo.
- **Prueba:** funcional; Profiler opcional.
- **Criterio:** conteos calculados en 1 pase; filas/inputs no relacionados no re-renderizan.
- **Métrica:** re-renders en tablas/formularios admin.

---

## ETAPA 4 — Optimización de fetching / BD

### T4.1 — Excluir `/api/dj/heartbeat` del `getUser()` del middleware (P-04)
- **Prioridad:** Medio · **Esfuerzo:** S · **Riesgo:** medio
- **Archivo:** `src/lib/supabase/middleware.ts` (lógica de paths), `src/middleware.ts`
- **Cambio:** tratar `/api/dj/heartbeat` como self-authenticating (el route ya revalida), evitando el `getUser()` redundante del middleware. Alternativa conservadora: subir el intervalo del heartbeat.
- **Dependencias:** verificar que el route valida sesión por sí mismo (lo hace).
- **Prueba:** heartbeat sigue actualizando `last_active_at`; el badge LIVE funciona; no se rompe auth de otras `/api`.
- **Criterio de aceptación:** 2 round-trips en vez de 3 por heartbeat.
- **Métrica:** llamadas auth por minuto por DJ (3 → 2).

### T4.2 — Paralelizar/gatear el layout autenticado (P-14)
- **Prioridad:** Medio · **Esfuerzo:** M · **Riesgo:** medio
- **Archivo:** `src/app/(app)/layout.tsx:34-122`
- **Cambio:** gatear `consumeBetaInviteIfAny` con once-guard (patrón de `booker/layout.tsx:64-76`); paralelizar el read de perfil con la evaluación de beta/suscripción donde el orden lo permita. Combinar con T1.1 (`getCurrentUser` cacheado).
- **Dependencias:** T1.1; cuidado con el orden de gating de auth (sensible).
- **Prueba:** navegación privada íntegra (DJ y booker); gating de suscripción/beta correcto.
- **Criterio de aceptación:** menos awaits en serie; sin regresión de acceso.
- **Métrica:** TTFB de páginas privadas.

### T4.3 — `push/send-cron`: agregación batched (P-15)
- **Prioridad:** Medio · **Esfuerzo:** M · **Riesgo:** medio
- **Archivo:** `src/app/api/push/send-cron/route.ts:118-131,254,268`
- **Cambio:** traer snapshots recientes por user en 1 query agregada; paginar `push_subscriptions`; documentar límite de users esperado.
- **Dependencias:** ninguna.
- **Prueba:** comparar salida de triggers antes/después con datos ficticios; medir duración.
- **Criterio de aceptación:** round-trips no crecen con nº de campañas/plataformas por user.
- **Métrica:** duración de `push/send-cron`; queries por corrida.

### T4.4 — (Medir antes) Índice para `account_status='active'` (H-01)
- **Prioridad:** Hipótesis · **Esfuerzo:** S (medir) · **Riesgo:** bajo (aditivo si se aplica)
- **Archivo:** `supabase/migrations/` (nueva migración solo si se confirma)
- **Cambio:** `EXPLAIN ANALYZE` de `getProfileBySlug`/`getPublicDjsBase`; si hacen scan por el filtro de igualdad, evaluar índice parcial `WHERE account_status='active'`. **No cambiar esquema sin confirmar.**
- **Dependencias:** acceso autorizado a la BD para EXPLAIN.
- **Prueba:** EXPLAIN muestra Index Scan tras el cambio.
- **Criterio de aceptación:** queries públicas calientes no hacen Seq Scan.
- **Métrica:** tiempo de query / plan del planner.

### T4.5 — Paginación real en CRM / leads / campañas (P-13 resto)
- **Prioridad:** Medio · **Esfuerzo:** M · **Riesgo:** medio (cambios de UI)
- **Archivo:** `lib/queries/contacts.ts:97,126`, `discovered-leads.ts:7`, `campaigns.ts:29`; páginas correspondientes
- **Cambio:** paginación cursor/offset; seleccionar solo columnas necesarias en list views (evitar `select('*')` donde la tabla no lo necesita).
- **Dependencias:** UI de paginación.
- **Prueba:** listas paginan; export CSV sigue completo.
- **Criterio de aceptación:** una página de lista trae ≤ page-size filas.
- **Métrica:** filas/transferencia por carga de lista.

---

## ETAPA 5 — Backend / infra / observabilidad

### T5.1 — Logger con niveles (P-22) + adopción del helper de PII (coordina T1.4)
- **Prioridad:** Bajo · **Esfuerzo:** S–M · **Riesgo:** bajo
- **Archivo:** nuevo `src/lib/log.ts` (o extender `log-safe.ts` existente); adopción gradual
- **Cambio:** silenciar `console.log` en prod, estandarizar `console.error` con contexto sin PII.
- **Prueba:** logs de prod sin ruido ni PII.
- **Criterio:** niveles respetados; 0 PII.
- **Métrica:** volumen de logs en Vercel.

### T5.2 — Escalonar horarios de crons (contención)
- **Prioridad:** Bajo · **Esfuerzo:** XS · **Riesgo:** bajo
- **Archivo:** `.github/workflows/*.yml` (schedules)
- **Cambio:** separar los crons que disparan a `0 12`/`0 13` a minutos distintos para evitar picos de concurrencia simultáneos.
- **Prueba:** los workflows disparan escalonados; sin solapamiento.
- **Criterio:** ≤1 cron por minuto.
- **Métrica:** concurrencia de funciones en Vercel.

### T5.3 — Monitorear middleware edge warning (P-25)
- **Prioridad:** Bajo · **Esfuerzo:** XS · **Riesgo:** alto si se refactoriza → **solo observar**
- **Archivo:** `src/lib/supabase/middleware.ts`
- **Cambio:** dejar como está (inherente al refresh de sesión); anotar el warning de Node API en edge para seguimiento; no refactorizar sin necesidad medida.
- **Prueba:** —
- **Criterio:** documentado en roadmap.
- **Métrica:** latencia de middleware / cold starts.

---

## ETAPA 6 — Monitoreo posterior

### T6.1 — RUM de Web Vitals + panel de métricas
- **Prioridad:** continua · **Esfuerzo:** S · **Riesgo:** ninguno
- **Cambio:** activar Web Vitals de Vercel Analytics (ya instalado) y revisar LCP/INP/CLS de campo; comparar contra baseline T0.1.
- **Criterio de aceptación:** dashboard con LCP<2.5s, INP<200ms, CLS<0.1 en móvil.
- **Métrica:** Core Web Vitals de campo; duración de funciones; egress; reads de BD.

---

## Orden recomendado de ejecución

1. **T0.1** (baseline) → **Etapa 1 completa** (T1.1–T1.7: máximo retorno, riesgo bajo).
2. **T2.1 → T2.2** (el gran lever de bundle; con cuidado y build antes/después) → **T2.3–T2.5**.
3. **T0.2** (tests) → **Etapa 3** (render del área privada).
4. **Etapa 4** (fetching/BD) → **T4.4 medir** antes de cualquier índice.
5. **Etapa 5** (infra/logs) → **T6.1** (monitoreo permanente).

**Ninguna tarea debe ejecutarse sin tu aprobación previa. Cada una es independiente y reversible; recomiendo PRs separados por etapa para poder medir el efecto de cada cambio de forma aislada.**
