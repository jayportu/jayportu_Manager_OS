# DROP. — Roadmap + estado del proyecto

> ⭐ **ESTE ES EL DOCUMENTO FUENTE DE VERDAD.**
> Si abres el proyecto y no sabes dónde estás o qué sigue, empieza acá.
> El `README.md` solo describe qué es DROP. y cómo levantarlo. Todo lo de
> "dónde voy / qué falta / qué decidí" vive en este archivo.

---

## 🚀 PLAN DE TRABAJO ACTUAL — Sprints por fase (2026-06-04)

> **Pivote estratégico (2026-06-04):** el foco pasa a ser el **lado booker** (la
> demanda). En un marketplace de 2 lados lo difícil es conseguir bookers, no DJs.
> DROP = "LinkedIn / IMDb de la música electrónica local". Valor para el booker:
> **ahorrar tiempo + bajar el riesgo** (hoy busca por IG, pide press kits por DM,
> escucha sets sueltos, pregunta disponibilidad por WhatsApp). La oferta (DJs) ya
> existe; el juego es habilitar y seducir a los bookers.
>
> Las fases reordenan el roadmap viejo: S20/S20.5 (marketplace + fee) se adelantan
> a Fases 0-1; S18.5/S19 (contratos/pagos) bajan a Fase 4; S22/S24/Productor pasan
> a Fase 5. El detalle de cada sprint sigue abajo como referencia.
>
> Etiquetas: 🔴 bug · 🆕 nuevo · ♻️ ya construido (reusar) · 📋 ya estaba en roadmap

### FASE 0 · Arreglar la vitrina · ~2-4 días
**Objetivo:** que `/dj` y el perfil público sean impecables con los DJs actuales.
Es la primera impresión de cualquier booker que se invite.

- [x] 🔴 Filtro de géneros case-insensitive (`directory.ts` usa `.overlaps` exacto vs chips en minúscula → 0 resultados). ✅ 2026-06-04 — verificado: house→11, tech house→9, minimal→9, afro house→3. Falta push.
- [x] 🔴 Tech rider / hospitality duplicado en `/p/[slug]` (notas legacy + estructurado se renderizan juntas). ✅ 2026-06-04 — saqué el bloque legacy de la rama con rider estructurado; verificado en 13 perfiles (estructurados limpios, legacy-only conserva fallback). Falta push. **↺ Reversa 2026-06-10 (PR #67):** el editor "estructurado por categorías + stage plot" había quedado como único editable y dejaba el texto IDEAL/ALTERNATIVO de **solo-lectura** → un DJ no podía organizar su rider como lo ve publicado (bug reportado). Volvimos al **editor simple**: 3 textareas IDEAL/ALTERNATIVO/HOSPITALITY (un equipo por línea) en `/configuracion`, guarda con `saveProfileAction`. El render del press kit ahora **prioriza ese texto**; el estructurado + stage plot queda como fallback solo para quien tenga ítems sin texto (no rompe data). `tech_rider_items` + `StagePlot`/`TechRiderRender` siguen en el repo por si se retoma. Verificado en vivo (editar→guardar→persiste→render IDEAL/ALT). *(Nota: esto invierte la "Unificación tech rider" del 2026-05-28 ↓, que había apuntado al estructurado.)*
- [x] 🆕 `/dj`: géneros más destacables + clic en género → listado filtrado. ✅ 2026-06-04 — card reestructurada (div + Link foto/nombre + chips de género como Links propios a /dj?genres=, hover naranja, hasta 3). Verificado: chip "HOUSE" → 11 DJs. Falta push.
- [x] 🆕 Botón "Ver press kit" aparte y llamativo (hoy se confunde con "Contactar"). ✅ 2026-06-04 — la card ink del PDF ahora dice "Ver press kit." (antes "Ver PDF.") → queda claro que es el press kit. Falta push.
- [x] 🆕 Botón de YouTube como botón real + tooltip en "X disponibles ahora". ✅ 2026-06-04 — fallback YouTube ahora es botón ink "▶ Ver canal en YouTube" (6 perfiles lo usan); badge "X disponibles para tocar" + tooltip explicativo. Falta push.
- [x] 🆕 Perfil público: pantones del "Contáctame" + orden de las casillas del form. ✅ 2026-06-04 — card sobria (blanca + acentos naranjos, antes 100% naranja); orden "datos del gig primero" (Nombre → Fecha → Tipo → Venue → Email → WhatsApp → Mensaje); bonus: arreglado voseo "Contame" → "Cuéntame". Verificado con screenshot. Falta push.
- [x] 🆕 Normalizar URLs (SoundCloud/YouTube/web) al guardar → mata el error de SoundCloud. ✅ 2026-06-04 — normalizeUrl (trim+https) en saveProfileAction (5 campos) + embed SoundCloud defensivo (repara doble-paste, degrada a link si la data es basura). Verificado en 11 perfiles. Data prod limpiada con `scripts/clean_profile_urls.mjs --apply` (3 doble-paste arreglados: Fer Canezza, Cristian Lens, Belixza). Falta push del código.
  - [ ] ⚠️ MANUAL: conseguir el handle real de SoundCloud de **Pablo Rocha**, **Milo Varas** y **NICO VILLEGAS** (hoy tienen su nombre con espacios; degradan a link). Cuando lo tengas, corregir en su perfil.
- [x] 🆕 Calidad de imagen: hero ~1600-2000px / q0.9, todo por `next/image` (nítido sin reventar egress). ✅ 2026-06-04 — compresión del avatar 1024→1600px / 0.82→0.9 en avatar-upload.tsx. Egress OK (miniaturas por next/image cacheadas; original se baja 1 vez). **Caveat:** aplica a uploads NUEVOS; los avatares ya subidos quedaron en 1024 → re-subir foto para ganar nitidez. No verificable en preview (es lógica de upload). Falta push.
- [x] ⚪ Stats del sidebar ("Contactos / Gigs") hoy en "—". ✅ 2026-06-04 — layout cuenta contacts (total) + calendar_events type=show del mes (count head:true, RLS-scoped) y los pasa al Sidebar. Verificado logueado: muestra 0/0 para user vacío (antes "—"). Falta push.

### FASE 1 · Perfil "mejor que Instagram" + confiabilidad · ~1 semana
**Objetivo:** que cada ficha de DJ baje el riesgo del booker.

- [x] ♻️ *(Ya existía antes de esta fase — no es tarea)*: foto, géneros, ciudad, SoundCloud, YouTube, press kit, clubs (gig stats), disponibilidad
- [x] 🆕 **Perfil verificado (1A)** — badge "✓ Verificado por DROP." curado por admin (toggle en /admin, trigger anti auto-verificación). ✅ 2026-06-05 en prod (PR #3, migración 0038 aplicada). jay-portu verificado de ejemplo.
- [x] 🆕 Ranking de confiabilidad granular (1F). ✅ 2026-06-05 — `verifications text[]` (identity/socials/sets, manuales vía chips en /admin) + historial AUTO (≥3 shows); bloque "— CONFIABILIDAD" en /p/[slug]. Migración 0042 (extiende el trigger anti auto-verificación). **"Respuesta rápida" diferida** (sin data de bookings aún). Trigger verificado: write directo por pg (sin service_role) se revierte solo.
- [x] 🆕 Fee aproximado (toggle por DJ). ✅ 2026-06-05 — `show_fee` + `fee_min/fee_max` (CLP); card "Tarifa referencial" con toggle en /perfil; "Fee ref. $X – $Y" en el bloque de reserva de /p/[slug] (solo si el DJ lo activa). Migración 0041. *(Cotizador interactivo completo = S20.5, futuro.)*
- [x] 🆕 Marcas/clubs con los que trabajó (RA-9 lite). ✅ 2026-06-05 — `brands_worked` editable en /perfil + sección "— HAN CONFIADO" (chips brutalist) en /p/[slug]. Migración 0040.
- [x] 🆕 Sets/mixes destacados (varios + Mixcloud) — RA-8. ✅ 2026-06-05 — `featured_sets` (hasta 4) en /perfil + sección "Sets destacados" en /p/[slug] con dispatcher SetEmbed (SoundCloud/Mixcloud/YouTube auto-detectado). Migración 0039 en prod. Verificado las 3 plataformas.
- [x] 🆕 Alias / sello / proyecto b2b — RA-10. ✅ 2026-06-05 — `aliases` + `record_label` en /perfil; en /p/[slug]: "AKA …" bajo el nombre + chip "Sello · …". Migración 0040.
- [x] 📋 DROP Picks (RA-2A): curaduría admin destacando DJs en `/dj`. ✅ 2026-06-05 — `is_drop_pick` + `drop_pick_priority` (migración 0043, protegidos por el trigger); ⭐ toggle en /admin; fila "★ DROP PICKS" arriba de /dj (solo sin filtros) + badge "★ PICK" en cards. Verificado.

### FASE 2 · Reabrir el lado booker · Founding Bookers · ~1 semana
**Objetivo:** traer los primeros bookers, a mano y curados. El backend ya existe casi entero.

- [x] ♻️ Ya en prod (pre-Fase 2): perfil booker, ficha de credibilidad, directorio de lugares, pitches+tokens
- [x] 🆕 Construir `/booker/buscar`: filtra por género, ciudad, disponibilidad y **presupuesto** + escucha sets inline + guarda favoritos *(la propuesta de valor exacta)*. ✅ 2026-06-06 (PR #14, en prod). Reusa `listPublicDjs` (extendida con fee/sets/budget), `FavoriteButtonClient` y `SetEmbed`. **Diferido a v2:** filtros guardados, recos por favoritos (= Fase 3 Smart Match), filtro por fecha específica.
- [x] 🆕 Reabrir signup booker. ✅ 2026-06-06 (PR #15, en prod). Campos: nombre+email+password+**país+ciudad** obligatorios (tipo opcional); verificación email obligatoria (mailer_autoconfirm off); anti-spam = rate-limit nativo + email confirm. País→ciudad dependiente (datalist vía countriesnow.space, fallback a texto libre). **CAPTCHA Turnstile pendiente** como paso de hardening (es global, toca los 4 forms de auth → ver Fase 6).
- [x] 🆕 Programa Founding Bookers. ✅ 2026-06-07 (PR #16, en prod; migración 0044). Invitación VIP con **token único de un solo uso** (mirror infra beta): admin invita en /admin/founding-invites → token → al registrarse (o próxima visita a /booker) queda `is_founding` + verificado auto, token invalidado. Badge ★ Founding en /admin/bookers y en la card de credibilidad que ve el DJ. **Construido 3/5 del bullet original** (invitación VIP + badge + verificado); los otros 2 — **gratis por X tiempo** y **acceso anticipado** — quedan DIFERIDOS a Fase 3 (flag `is_founding` listo, pero hoy no hay nada pago/exclusivo que gatear). CAPTCHA del signup pendiente (Fase 6 hardening).

> **✅ FASE 2 COMPLETA (2026-06-07):** buscar (PR #14) + signup reabierto (PR #15) + Founding Bookers (PR #16). El lado booker está listo para traer los primeros bookers curados. **Siguiente: Fase 3 · Smart Match.**

### FASE 3 · Smart Match · el gancho de pago · ~1-2 semanas
**Objetivo:** feature exclusiva del booker que justifica suscripción.

- [x] 🆕 **Smart Match v1 estructurado.** ✅ 2026-06-08 (PR #33 + #34, en prod). Booker describe su evento (tipo + ciudad + fecha + presupuesto + géneros) en `/booker/match` → DROP ranquea DJs con el **porqué** de cada match. Score 0-100 = Relevancia (género 35 · ciudad 25 · disponibilidad-en-la-fecha 20 · presupuesto 10) + Calidad (completitud + verificado + DROP Pick 10). Capa de scoring pura sobre la lectura cacheada del directorio → **costo $0, sin LLM, sin infra, sin migración.** Es la versión booker-initiated de "Para ti" (RA-2B).
- [x] 🆕 **"Más info → más visibilidad".** ✅ 2026-06-08 (PR #34). `computeCompleteness` rankea más arriba al perfil más completo + nudge en `/perfil` ("estás X% completo → llena Y para subir en Smart Match"). Mismo cálculo en ambos lados.
- [x] 🚫 **Ollama descartado.** La infra Ollama existente solo corre en el Mac de Jaime (browser→localhost) → inútil para bookers. La IA generativa NO se usa en Smart Match. El tab "IA" ya se sacó del nav (QA m5).
- [x] 🆕 **v2 — match por texto libre (heurístico).** ✅ 2026-06-08 (PR #36, en prod). El booker escribe "algo melódico para un rooftop al atardecer" → parser de sinónimos (`src/lib/match/parse-query.ts`) lo mapea a géneros + vibes, **sin LLM ni embeddings → $0, cero dependencias externas**. Embeddings reales se evaluaron y descartaron por ahora (rompen el $0 → ver Backlog). **Acceso anticipado = perk Founding:** el texto libre es exclusivo de bookers `is_founding` (gating server-side); el resto usa el v1 estructurado abierto.

> **✅ FASE 3 COMPLETA (2026-06-08):** Smart Match v1 estructurado (PR #33/#34) + v2 texto libre heurístico (PR #36) + perk Founding "acceso anticipado", todo en prod y gratis de operar. (El gating de pago + perk "gratis por X tiempo" viven en Fase 4; embeddings/saved-searches en Backlog.) **Siguiente: Fase 4 · cerrar el ciclo del booking (pagos/MP).**

### FASE 4 · Activar suscripción + contratos · ⏸️ EN PAUSA (stand-by hasta fin de beta)
**Objetivo:** prender el único cobro de DROP — la **suscripción del DJ** ($9.990/mes vía MP). Contratos, opcional.
> **Decisión 2026-06-08:** DROP cobra **solo la suscripción al DJ**, y queda en stand-by **hasta terminar la beta**. **DROP NO intermedia el pago booker↔DJ** — ese pago es responsabilidad exclusiva del booker, va directo y no pasa por DROP (ya cubierto en /terms · Limitación de responsabilidad). Los pagos integrados (Idea 3) quedan **descartados**, no diferidos.

- [ ] 📋 **Activar suscripción del DJ en prod** — S19 ♻️ code-complete (MP *preapproval* $9.990/mes), faltan los 5 pasos de prod (ver sección 12). Es el cobro de DROP, NO el pago del booking.
- [ ] 🪙 **Gating de pago + perk Founding "gratis por X tiempo"** (heredado de Fase 3). Al prender la suscripción: gatear Smart Match con `evaluateSubscriptionAccess` y dar gratis por X tiempo a `is_founding`. Hooks listos. *(El perk "acceso anticipado" ya se activó en Fase 3.)*
- [ ] 🔴 QA diferidos de cobros: botón "Reactivar" suscripción + acceso en estado `pending` — se arreglan al activar la suscripción.
- [ ] 📋 S18.5 Contratos (firma electrónica simple, click-wrap + hash) — opcional, no bloquea.
- [x] 📋 Calendario público de disponibilidad en `/p/[slug]` (S20, idea 4) — ✅ **HECHO (PR #148, Capa 2 presskit):** `components/availability/availability-calendar.tsx` en /p/[slug] + `getPublicBusyDates` (`lib/queries/availability.ts`) + ventana `available_from/until/note`. *(El roadmap lo tenía mal como pendiente — corregido en el repaso 2026-06-30.)*

### FASE 5 · Loops de crecimiento y retención · paralelo, con tracción
> Vamos **en orden**: RA-5 ✅ → RA-6 ✅ → RA-7 ✅. **Fase 5 (loops core) completa.**
- [x] 🆕 **RA-5 · Analytics del press kit.** ✅ 2026-06-08 (PR #39, en prod). Vista `/press-kit/stats`: rango 7/30/90, KPIs (visitas/clicks/solicitudes/conversión), embudo, visitas por día, por canal, "de dónde llegan" (referrer/país/UTM — data capturada nunca mostrada) y solicitudes por estado. Barras CSS, sin librería, **$0**. Migración 0047 (RPCs agregadas) **destapó el cap de 1000** → cierra el QA finding de press-kit ↓.
- [x] 🆕 **RA-6 · Aviso de fecha a seguidores.** ✅ 2026-06-08 (PR pendiente, en prod). El loop de email ya existía (RA-3: `dj_update_events` + trigger + cron diario que emaila a seguidores con `notify_email=true`). Este sprint lo **destrabó**: arregló 2 bugs pre-existentes que lo dejaban muerto — (1) `booker_favorites` no tenía policy de UPDATE → activar/desactivar avisos era un no-op silencioso (migración 0048); (2) la grilla de favoritos en `/booker/seguidos` salía siempre vacía (join a `dj_profile` bajo RLS owner-only → ahora resuelve vía admin client). Polish: toggle 🔔 clickeable en `/booker/seguidos` + feedback al DJ en disponibilidad. **"Instantáneo" (digest diario es suficiente, menos spam) y "push" (infra pesada) diferidos** — sin combustible aún (0 seguidores). Verificado en vivo: toggle persiste true↔false.
- [x] 🆕 **RA-7 · Página de evento + RSVP.** ✅ 2026-06-08 (en prod). El DJ publica un show del calendario como página pública `/e/[token]` (botón "Evento" en /calendario → `/calendario/[id]/evento`); los fans (sin cuenta) hacen RSVP por email (voy/quizás + "avísame"). El DJ ve la lista de asistentes = **leads** + export CSV. Los fans que tildan "avísame" reciben email cuando el DJ publica un próximo evento (síncrono + rate-limited; cap 100 → mover a cron si crece). Migración 0049 (`calendar_events.is_public/public_token/ticket_url` + tabla `event_rsvps` con policy SELECT al dueño). Verificado en vivo: publicar → página pública → RSVP persiste + contador + el DJ ve el lead. *(El envío de email a fans solo corre en prod: `RESEND_FROM_EMAIL` no está en el .env local.)* **Endurecido post-QA (2026-06-10, PR #62):** `escapeHtml` en el email a fans (anti-inyección), **baja real** vía link de unsubscribe por RSVP, cap síncrono 50 + `maxDuration=60`, solo `type='show'` publicable, "N van" cuenta solo "voy", upsert robusto (carrera), CSV con BOM + anti-fórmula. **2 decisiones tomadas:** (a) **M10 — double opt-in del fan DIFERIDO a escala** (mitigado: el aviso solo sale al publicar y ahora trae baja real → daño acotado; el double opt-in metería fricción justo en el loop fan→lead); (b) **republicar mantiene el token a propósito** (evita re-spamear y conserva el link compartido — no es bug).
- [x] 🆕 **Landing público editorial (estilo RA).** ✅ 2026-06-10 (PR #80, en prod). Reemplaza la home split "DJ/Booker" (solo logged-out; los logueados siguen con sus redirects) por un landing editorial: hero + dos puertas, **SUENA AHORA** (DJs reales de `listPublicDjs`, recién sumados + disponibles, badge "Nuevo"), **DROP. RECOMIENDA** (colecciones editoriales con conteos+links reales a `/dj?genres=`, ocultando las que matchean 0), **ranking ADAPTATIVO** (`getLandingRanking`: "Los más seguidos del mes" si ≥3 DJs con seguidores; si no, "Destacados" = picks→verificados→recientes), cómo funciona, todo lo que incluye, footer. **100% data real, se actualiza solo** (lectura base cacheada 5 min); cada sección se oculta si vacía. Español neutro (sin voseo ni chilenismos), CTA una sola vez. `directory.ts`: +`created_at`, sort `recent`, `getTopFollowedDjs` (cuenta `booker_favorites` in-memory, sin migración). Mockup aprobado = `drop_home_v3_mockup.html`. **Limpieza de datos asociada:** cuenta de prueba TEST TRIAL oculta del directorio; país corregido en 2 DJs reales (Robin Hastings → Países Bajos, Fer Canezza → España).
- [x] 🎵 **Música / discografía en el press kit ("tab Productor" sección 14, Capa A) — ✅ HECHO.** Releases y música del DJ en `/p/[slug]`, mostrados cuando hay data (integrado en el press kit, sin flag `is_producer` ni tab aparte): featured sets/mixes (#148, `featured_sets`) · **releases de Beatport** con player embebido (#154, `beatport_url`+`beatport_releases`, migr 0060) · **releases de Bandcamp** (#150, `bandcamp_url`) · embeds SoundCloud/YouTube. *Opcional/no comprometido:* Capa B (sync de stats de Spotify) + Capa C (Apple Music). *(El roadmap lo tenía mal como pendiente — corregido en el repaso 2026-06-30.)*
- [ ] 📋 **Futuros sueltos:** S22 Ads tracker · **S24 «música personal» = biblioteca de tracks + wantlist** (feature aparte tipo Discogs, NO es la discografía del press kit ↑ — sigue sin hacer) · Descubrir locales cerrados (sección 15)
- [ ] 🆕 LinkedIn / contenido para bookers — *track de marketing, no código*

### FASE 6 · Hardening pre-lanzamiento público · gate antes de abrir
**Objetivo:** abrir a bookers = más exposición → blindar antes.

- [x] ⚪ **Quick wins de hardening.** ✅ 2026-06-08 (en prod). Rate-limit agregado a los endpoints públicos que faltaban (`/api/booking`, `/api/feedback`, `/api/nps`, `/api/overpass`); **security headers** en `next.config.mjs` (HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy) + **CSP en Report-Only** (no bloquea — base para endurecer); **Dependabot** (`.github/dependabot.yml`, dejado en **solo-seguridad** desde #58 — la activación inicial generó ráfaga de PRs/emails de updates rutinarios; ahora solo abre PR ante una vulnerabilidad). Verificado en vivo: headers presentes + `/api/booking` da 429 tras 10/min.
- [x] 🔴 **Next.js 14 → 15** ✅ 2026-06-08 (en prod). Subido a **next@15.5.19** manteniendo **React 18** (los CVEs eran de Next, no de React → mínimo riesgo). **14 CVEs HIGH eliminados** (quedan 2 moderate transitivos: postcss bundleado en Next + uuid de MercadoPago, ya aceptado en 13.2). Suave porque el código ya era async-ready (`cookies()` await + `params`/`searchParams` Promise). Fixes: `<a href="/gmail">`→`<Link>` (lint estricto), `outputFileTracingRoot` (lockfile perdido en ~/), tsconfig target→ES2017 (auto). Smoke test en vivo: /dj, login→dashboard, /calendario, /p/[slug] ✓.
- [x] 🟢 **CAPTCHA Turnstile** en los 4 forms de auth. ✅ **ACTIVADO en prod 2026-06-10** (Cloudflare Turnstile Managed + Vercel + Supabase). Verificado: el widget se sirve en el login (Site Key en el bundle) y Supabase **rechaza** un login sin token (`captcha_failed: no captcha_token found`). Login/signup DJ + signup booker + forgot-password pasan `captchaToken` al SDK de Supabase; `/api/beta` verifica server-side propio. Código: PR #69 (dormido) → activación con llaves PR #76-#78. **⚠️ Gotcha que costó 1h (documentado en `.env.example`):** (a) `NEXT_PUBLIC_TURNSTILE_SITE_KEY` NO debe ir como "Sensitive" en Vercel (se hornea en el build; lo correcto es no-sensitive — es pública igual); (b) Vercel/Next reusa **build cache** y sirvió chunks viejos con la llave vacía — hubo que tocar un source del bundle (`turnstile-widget.tsx`) para forzar recompilación. Verificar inlining = grep del valor en el chunk de prod.
- [x] 🟡 **Sentry** monitoring. ✅ código en prod 2026-06-10 (PR #71), **dormido hasta poner el DSN** (deploy Vercel success verificado). `@sentry/nextjs` con `src/instrumentation.ts` (server/edge) + `src/instrumentation-client.ts` (browser) + `src/app/global-error.tsx` (boundary raíz branded). Guardado por DSN → sin llaves no inicializa nada (build idéntico). `tracesSampleRate 0` (solo errores, cuota free) + `sendDefaultPii false`. **Activación = pasos de Jaime (sin deploy de código):** (1) cuenta gratis en sentry.io → New Project → Next.js "dropgigs"; (2) `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` (mismo DSN) en Vercel Prod+Preview → redeploy. Opcional: Auth Token + `withSentryConfig` para source maps (trazas legibles). Detalle en `.env.example`.
- [x] 🔒 **CSP enforce.** ✅ en prod 2026-06-10 (PR #73, verificado: header `Content-Security-Policy` sin Report-Only, sitio 200). Pasó de "solo observa" a **bloqueo real**. Allowlist corregido antes de activar: `wss://*.supabase.co` (realtime) + `https://*.sentry.io` (ingest) + `worker-src blob:` + `frame-ancestors 'self'`. Probado en preview: imágenes Supabase + reproductores SoundCloud/YouTube cargan, dominio ajeno bloqueado. **Mantiene `'unsafe-inline'`/`'unsafe-eval'`** (Next sin nonces) → el strict full con nonces queda como pase futuro; aun así ya bloquea scripts de dominios no autorizados (XSS/supply-chain) + object/base/form.
- *(**CSP strict con nonces** — opcional; consolidado en el **Checklist de lanzamiento** ↓.)*
- [x] 🚫 **2FA — DESCARTADO** (2026-06-10). Para cuentas de DJ/booker (su valor = un press kit) la fricción supera al beneficio: barrera de setup (app autenticadora) en el onboarding, paso extra en cada login, y riesgo de bloqueo/soporte si pierden el teléfono. Ya hay otras defensas (reset de contraseña, login Google que trae su propio 2FA, moderación). Si alguna vez se quiere, sería **solo para cuentas admin**, no para usuarios. Ver "Descartado explícito" ↓.
- [ ] 🟡 **M10 · Double opt-in del fan (RA-7)** — hoy un fan puede inscribir el email de un tercero a los avisos de un DJ. **Diferido a escala** (mitigado: el aviso solo sale al publicar un nuevo show + baja real en cada correo). Revisitar si crece el volumen o aparecen quejas de spam: mandar correo de confirmación antes de activar `notify_future`.
- [x] 🟡 **Encriptar los tokens de Gmail en reposo** — ✅ **HECHO (Fase 6, 2026-06-30, DORMIDO por env).** `lib/gmail/token-crypto.ts`: AES-256-GCM (autenticado), cifra `access_token`/`refresh_token` al escribir (callback + refresh) y descifra al leer (getGmailToken + revoke). **Dormido:** sin `GMAIL_TOKEN_ENC_KEY` → texto plano (comportamiento actual). Al setear la llave en Vercel (`openssl rand -hex 32`) los tokens nuevos se cifran (prefijo `enc:v1:`) y las filas legacy se re-cifran solas en el próximo refresh (backfill orgánico). Roundtrip verificado (6/6). **Activar = poner `GMAIL_TOKEN_ENC_KEY` en Vercel + redeploy.**
- [x] 🟡 **Revocar el token en Google al desconectar Gmail** — ✅ **HECHO (Fase 6, 2026-06-30).** `deleteGmailConnection()` ahora revoca el token en `https://oauth2.googleapis.com/revoke` ANTES de borrar la fila (best-effort: un fallo de red no impide la desconexión local). Revocar el refresh_token invalida también sus access_tokens. *(Contexto: la auditoría 2026-06-13 cerró lo crítico/alto/medio — escalada a admin, webhook MP, SSRF, tokens Gmail solo-servidor, unsubscribe firmado — en PRs #126–#129. Estos dos son los pendientes de baja prioridad que quedaron.)*
- [x] ⚪ **Re-auditoría de seguridad integral + quick wins** *(2026-06-18, PR #146 en prod)* — barrido completo de 6 capas (auth/sesiones, 34 rutas API, 31 server actions, RLS/migraciones 0028–0057, storage/uploads, infra/secretos/headers): **0 críticos / 0 altos** — el hardening de #126–#129 + RLS (toda tabla con RLS, 0 `USING(true)` para anon/authenticated, 0 vistas SECURITY DEFINER) + webhooks firmados + crons protegidos + allowlist de MIME a nivel bucket resistieron. **Cerrados en PR #146:** piso `assertAdmin()` en `admin/layout` (red de seguridad ante una page nueva sin gate); comparación **constant-time** del `CRON_SECRET` en los 7 crons (`src/lib/cron-auth.ts`); errores genéricos al cliente en feedback/nps/story.png (no filtrar Postgres/schema/stack); allowlist de MIME png/jpeg/webp en feedback; migr **`0058`** fija `search_path=public,pg_temp` en `handle_new_user()`; bump no-breaking `@opentelemetry/core` 2.7.1→2.8.0. Pendientes abiertos ↓.
- *(**M1 · rate-limit público por infra (Cloudflare WAF)** — consolidado en el **Checklist de lanzamiento** ↓ con el paso a paso.)*
- [x] 🟡 **M2 · Anti DNS-rebinding en `url-guard`** — ✅ **HECHO (Fase 6, 2026-06-30).** Nueva `isSafePublicHttpUrlResolved()` (async) resuelve el hostname por DNS y valida que TODAS las IPs resueltas sean públicas (v4/v6 + v4-mapped); si falla o alguna es privada → bloquea. Usada en los 2 sitios de `fetch` server-side: `webhook/test` y `tracklist/notify`. La sync `isSafePublicHttpUrl` queda como primera línea al guardar. Lógica de IP verificada con test (18/18). *Residual conocido:* ventana TOCTOU (aceptable — endpoints autenticados; pinnear IP rompería SNI/TLS).
- [ ] 🔵 **M4 · Higiene de secretos `.env.local`** *(auditoría 2026-06-18)* — el archivo tiene secretos productivos reales (service_role, `DATABASE_URL`, `CRON_SECRET`, `GOOGLE_CLIENT_SECRET`…); está gitignored y nunca se commiteó (verificado), pero vive en el Escritorio junto a artefactos que podrían comprimirse/compartirse. FileVault activo + no incluir la carpeta en zips/screen-shares. *(El flip MP TEST→PROD ya está trackeado en Fase 4 · stand-by.)*
- [x] 🟡 **Bookers suspendibles** — ✅ **HECHO (Fase 6, 2026-06-30, migración 0063 aplicada en prod).** Espeja el patrón de DJs (migración 0030): **migración `0063`** = `account_status` + reason/changed_at/changed_by en `booker_accounts` + trigger `protect_booker_account_status()` (anti auto-reactivación) · `setBookerAccountStatusAction` en admin/actions · `BookerStatusControl` (suspender/banear/reactivar) + badge de estado en `/admin/bookers` · gate en `booker/layout.tsx` (redirige a `/cuenta-suspendida` si suspended/banned) · `/cuenta-suspendida` ahora role-agnostic (mira dj_profile **y** booker_accounts). Migración corrida por Jaime; build verde.
- *(**Ops de lanzamiento** — DMARC `p=reject`, rotar API key Resend, verificar backups Supabase — consolidado en el **Checklist de lanzamiento** ↓.)*
- [x] 🔵 **Infra en planes PRO (uso comercial regularizado).** **Supabase Pro** desde 2026-06-04. **Vercel Pro** desde 2026-06-10 — forzado: el plan Hobby es solo no-comercial y Vercel **dio de baja el proyecto** (dropgigs.com cobra suscripción); en Pro queda en regla + builds concurrentes + límites más altos. **No volver a Hobby.** Costo infra ≈ US$45/mes (Vercel ~$20 + Supabase ~$25).
- [x] 💸 **Bajar uso/costo de Vercel — trampa de crawler en `/dj` (2026-06-12, PRs #115–#117, en prod).** *(De otra conversación — registrado acá para no perderlo.)* Diagnóstico: los filtros de `/dj` + chips generan combinaciones casi infinitas de URLs (`/dj?genres=...&city=...`) → los bots golpeaban **`/dj` ~1M veces/12h** (99% del uso de Vercel). Tres capas: **#115 Capa 1** — menos invocaciones (optimización del `getUser` del middleware + AutoRefresh del panel de campañas); **#116 Capa 2** — cierra la trampa: `robots.txt` `Disallow: /dj?` + `noindex` en las vistas filtradas de `/dj` (el `/dj` limpio sigue indexable); **#117 Plan B** — bloquea crawlers agresivos/IA en `robots.txt`. **⚠️ PENDIENTE: verificar que el tráfico a `/dj` efectivamente cayó** (mirar el uso de Vercel unos días). Si reincide, escalar a **Vercel Firewall / WAF** (rate-limit por ruta).
- [x] ⚪ **QA tab por tab (2026-06-07/08)** — barrido exhaustivo de bugs/fricciones por pestaña (workflow multi-agente, 77 hallazgos). **73/77 arreglados y en prod** (PRs #17–#31): 11 altos + 30 medios + 32 bajos. Bonus de la tanda: dashboard de email en tiempo real (webhook `campaign_id`, PR #13) y Gmail N+1 → batch endpoint (PR #31). **Quedan 3 a propósito:** 2 de cobros (reactivar suscripción + acceso en `pending`) → entran con Fase 4 · pagos; IA race condition (moot — la IA salió del nav). *(El press-kit tope-1000 quedó resuelto por RA-5 / migración 0047.)* Detalle completo en `QA_FINDINGS.md`.
- [x] ⚪ **Test de funcionalidad de lo nuevo (2026-06-10)** — Smart Match, RA-5/6/7 y hardening/Next 15 (3 revisores + pruebas en vivo, ~34 hallazgos). **32 arreglados y en prod**, en 5 PRs por área: **#61** Smart Match (score inflado, chips que se borraban al buscar, parser por límites de palabra, embudo tope 100%, crash de params duplicados); **#62** RA-7 (ver detalle ↑: escapeHtml, baja real, cap+maxDuration, solo-show, "N van", upsert, CSV); **#63** RA-5 analytics (suma de barras = KPI, día Chile sin DST, embudo sin desborde); **#64** RA-6 (toggle 🔔 sincronizado entre instancias); **#65** hardening + bajos (IP real `cf-connecting-ip` tras Cloudflare, nudge foto, `<button>` fuera del `<Link>`, CSP + countriesnow.space, código muerto). Prod verificado sano (deploy success + CSP nueva en vivo). **2 quedan a propósito:** M10 (double opt-in del fan, diferido a escala — ver hardening ↓) y republicar-mantiene-token (por diseño).
- [x] ⚪ **Admin UX — navegación + moderación (2026-06-11, PR #83).** Barra de navegación **fija** en todo el backoffice (`admin-nav.tsx` + `admin/layout.tsx`) → se acabó el "retroceder la página" para cambiar de sección (incluye "← Volver a la app" + breadcrumb). **Acción Eliminar cuenta** (hard delete vía `admin.auth.admin.deleteUser`, cascada; guards no-self / no-admin; audit `admin_account_deleted` previo) para limpiar cuentas de test, con confirm **type-to-confirm "ELIMINAR"**. Sistema de **diálogos propios** (`useConfirm` promise-based, reemplaza `confirm()`/`alert()` nativos) + escala de botones unificada (`adminBtn`); ~12 componentes admin migrados. Mockups aprobados.
- [x] 📊 **Analítica de tráfico — híbrida (2026-06-11).** **(A)** **Vercel Web Analytics** (PR #82/#84, `@vercel/analytics`) → tráfico anónimo agregado (visitas/páginas/referrers) sin tocar performance; habilitar Web Analytics en el dashboard de Vercel para que reporte. **(B)** **Panel propio `/admin/trafico`** (PR #85, migración 0050 `site_events` aplicada en prod) → lo que Vercel **no** puede: **registrados vs anónimos** + **embudo de conversión** visita anónima → solicitud de invitación → cuenta creada. Beacon `SiteTracker` (`sendBeacon` por navegación, `session_id` 30 min) → `/api/site-track` (público, rate-limited, resuelve registrado/anónimo por sesión Supabase, inserta vía admin client). KPIs + visitas por día (tz Chile) + páginas top + referrers + estadía prom + tiempo real, con empty-state. *(Cubre parte del "pulso de beta": el lado tráfico→conversión; falta el lado DJ invitados→registrados→perfil completo.)*
- [x] 🎉 **Feed de eventos para fans + fix gate RA-7 (2026-06-11, PR #86).** La cara de DROP. para **fans sin cuenta**: qué fiestas/shows vienen y RSVP sin registrarse. **`/eventos`** (feed público completo + empty-state) + sección **"Próximos eventos"** en el landing (se oculta si no hay) + `EventCard` + chrome compartido (`SiteHeader`/`SiteFooter`, link "Eventos"). Query `getUpcomingPublicEvents` (shows públicos próximos de DJs activos, soonest-first, batch sin N+1). **🐛 Fix de bug latente de RA-7 en prod:** `/e/`, `/api/event-rsvp` y `/eventos` **NO estaban en `PUBLIC_PATHS`** del middleware → un fan anónimo recibía **307→/login**, o sea las páginas de evento de RA-7 eran **inalcanzables sin cuenta** (¡el caso de uso central!). Agregadas a la allowlist; verificado (307 desaparece, `/e/<bad>`→404, `/api/event-rsvp` valida, `/eventos`→200). *(El happy path del EventCard con data real no se screenshoteó: insertar un evento de prueba toca prod y lo bloqueó el classifier — código presentacional simple + build OK.)*

- [x] ⚪ **QA completo tab por tab (2026-06-11)** — barrido multi-agente (12 zonas, 63 agentes) + verificación adversarial + runtime de flujos públicos. **100 hallazgos reales** (6 falsos positivos descartados): 3 altos · 25 medios · 72 bajos. Reporte completo en `QA_FINDINGS_0611.md`. **Los 3 altos + TODOS los medios confirmados arreglados y en prod**, en 7 lotes:
  - **#89 (lote 1):** webhook MP a PUBLIC_PATHS (los pagos nunca se procesaban) · `/api/unsubscribe` deja de mutar por GET (prefetchers desuscribían fans) · anti-SSRF + rate-limit en tracklist/notify · tanda zona horaria UTC→Santiago (disponible-hoy, KPIs finanzas, recurrentes) · marca `drop.dj`→`dropgigs.com`.
  - **#90 (lote 2):** caps silenciosos `/dj` (200→todos) y CRM (500→count exacto + "primeros N de M").
  - **#91 (lote 3):** open-redirect en `/auth/callback` · webhook MP 500-para-reintento · site-track chequea error · `paid_at` se limpia al despagar.
  - **#92 (lote 4):** import CSV del CRM — dedup, respeta score del CSV, valida email/whatsapp.
  - **#93 (lote 5):** Gmail hilo vacío ya no crashea · convertBooking con rollback · límites de largo en form de booking · sync de redes idempotente por día.
  - **#94 (lote 6):** menú móvil en el header público (los fans no llegaban a /eventos en celular) · favoritos N+1 resuelto (1 query server-side en /buscar y /match).
  - **#95 (lote 7):** retención D15 (usaba ventana de 3d) · cap email-campaigns 3000→50000 (subcontaba la campaña grande) · cap site-analytics expone `partial` + aviso.
  - **Pendiente a propósito:** `/ia` fuera del menú = decisión tomada (IA deprecada, Ollama solo local). **Quedan los 72 bajos** (cosméticos) + 3 inciertos (necesitan runtime). La agregación SQL de `/admin/trafico` es mejora futura (hoy mitigada con aviso de datos parciales).

### 🚀 CHECKLIST DE LANZAMIENTO OFICIAL — antes de abrir al público

> Nada de esto es código ni bloquea la beta; son **acciones de Jaime en paneles externos** para blindar cuando se abra al público general. Costo/esfuerzo bajo, alto valor. Tildar cuando se prepare el lanzamiento.

- [ ] 🟡 **M1 · Rate-limit en Cloudflare WAF.** 1 regla gratis: Cloudflare → dropgigs.com → **Security → WAF → Rate limiting rules → Create**. Apunta a los endpoints anónimos (`/api/beta`, `/api/booking`, `/api/event-rsvp`, `/api/track`, `/api/site-track`); ej. **20 req/min por IP → Block/Challenge 10 min**. Protege correos (reputación Resend) + factura Vercel de un flood distribuido, que el rate-limit de-app (en memoria, por instancia) NO frena. *No toca código.* (Ver antecedente: incidente crawler GPTBot, [[vercel_usage_bots_lesson]].)
- [ ] 🔵 **DMARC `p=reject`.** Subir el registro TXT `_dmarc` de `p=none`/`quarantine` → **`p=reject`** una vez que la reputación de envío esté estable (SPF/DKIM ya OK). Endurece contra spoofing del dominio.
- [ ] 🔵 **Rotar la API key de Resend.** Generar una nueva en Resend → reemplazar `RESEND_API_KEY` en Vercel (Prod) → **redeploy** → revocar la vieja. (Higiene de secretos pre-lanzamiento.)
- [ ] 🔵 **Verificar backups de Supabase.** Plan **Pro** (desde 2026-06-04) incluye snapshots diarios / PITR → confirmar que estén activos en Supabase → Database → Backups. Solo verificar, no configurar.
- [ ] 🟡 **Legal #7 · auditar `/privacy` y `/terms` con asesor jurídico** (DPAs realmente firmados, retracto, facturación, renovaciones) — ver detalle en el bloque de auditoría de portada ↑. Importante ANTES de cobrar/abrir.
- [ ] ⚪ *(Opcional)* **CSP strict con nonces** — diferido, alto esfuerzo/riesgo; solo si se quiere blindaje XSS extra (ver Fase 6 ↑).

> **Relacionado (decisión de negocio, su propia fase):** activar la **suscripción del DJ** (Fase 4 · stand-by hasta fin de beta) es parte de "lanzar oficialmente" pero es decisión aparte, no ops de hardening.

### Backlog / deuda menor (no bloquea)
- [~] ⚪ **QA bajos (72)** — Detalle en `QA_FINDINGS_0611.md`. **~31 arreglados (2026-06-11, PRs #97–#101):** copy/voseo, ~12 `{error}` no chequeados (growth/founding/push/gmail/sync/tracklists/booker/inbox/suscripción/reorder), caps de 1000 (events feed, getTopFollowedDjs, listMyEvents), guards account_status (/api/track + /api/booking), hardening (b/[token] cap+clamp, push rate-limit, resend anti-replay, gmail disconnect same-origin), correctness/SEO (middleware /signup/booker, CRM ?score NaN, JSON-LD, presskit event_date, OG image+canonical /p, counteroffer min-date). **(a) HECHO ✅ (PR #103):** `alert/confirm` nativos → diálogo de marca; ConfirmProvider montado en `(app)/layout` + modo `hideCancel`; migradas tracklist-editor, CRM follow-ups, descubrir lead-actions, campañas contact-row, IA strategy-mode, Gmail associate-contact (~37 bajos arreglados en total). **(a)+pulido HECHO ✅ (PRs #103, #105):** CERO popups nativos en toda la app — ~19 componentes migrados al diálogo de marca. **(d) RESUELTO (2026-06-11):** assertBetaActive agregado a availability/autopost (PR #106, "bloquear" elegido); acceso `pending` indefinido → se deja como está (billing en stand-by); republicar reusa token → se mantiene (por diseño). **next/image guard (anti-crash) + key React HECHO ✅ (PR #108):** /booker/pitches/interesados/seguidos usan isSupabaseStorageUrl; feed /trafico con key compuesta. **~52 de 72 arreglados.** **Quedan solo ítems DIFERIDOS A PROPÓSITO (no-bloqueantes, deuda técnica menor consciente):** (b) sub-día TZ (`follow-ups nextDueDate`, `datetime-local` con offset del navegador — ±1h, correcto para equipo en Chile; reescribir a wall-time es riesgo>beneficio); (c) perf que exige refactor riesgoso o sin impacto a escala beta (consumeBetaInvite por-request → requiere reordenar el layout crítico; listFeedbackReports N llamadas; send-cron N queries; costo del auto-refresh de /trafico); + 3 sueltos sin valor/ con riesgo de data (sort_order race single-user, tipo `source:"ollama"` con filas históricas, versión hardcodeada del footer booker). **Decisión: no tocar — el costo/riesgo supera el beneficio. Revisitar solo si el perfil de uso cambia (más escala) o aparece un síntoma real.**
- [ ] 🆕 **Smart Match v2 parte 2** (solo si el heurístico se queda corto): semántica con embeddings + pgvector, búsquedas/alertas guardadas, filtro por fecha exacta de calendario. Embeddings = costo recurrente + dependencia externa → por eso quedó fuera del v2 actual.
- [ ] ⚪ Paginación CRM a escala · acciones masivas · duplicar plantilla · botón PNG tracklist (BUG-02) · drill-down posts→campaña en Growth. *(Ya hechos en sesiones recientes: validación email/WhatsApp server-side en contactos —2026-06-11—; dedup/idempotencia en crons —growth sync + MP webhook—.)*
- [ ] 📋 RA-4 Panel multi-entidad (último — cambio de arquitectura mayor)

### 🚀 TRACCIÓN — automatización + manual (2026-06-11 →)

> **Marco:** marketplace de 2 lados. La oferta (DJs) ya viene por la campaña (861, 70/día hasta 15-jun). El cuello de botella es la **demanda (bookers)**. Motor más barato: cada DJ con perfil completo es un **nodo de distribución** (comparte su press kit `/p` y eventos `/e` a su audiencia IG/WhatsApp → llegan fans y bookers). Flywheel: DJ comparte → llegan bookers → contratan → al DJ le va bien → comparte más.
>
> **Plan en 3 capas:** (1) MEDIR · (2) ACTIVAR la oferta · (3) SEMBRAR la demanda.

- [x] 🤖 **Activación automática — nudge de onboarding incompleto (capa 2, PR #110, DORMIDO).** Correo único "termina tu perfil" a DJs que crearon cuenta y dejaron el onboarding a medias hace +24h, con los ítems que faltan (dinámico, del score de completitud). Migración 0051 (`onboarding_nudge_sent_at`, one-shot idempotente) en prod. Cron `/api/onboarding-nudge/cron` (CRON_SECRET, GitHub Actions diario 14:00 UTC) + preview en `/admin/onboarding-nudge` (pestaña "Nudge"). **Sale dormido (dry-run) — no manda nada hasta `ONBOARDING_NUDGE_ENABLED=true` en Vercel.** Verificado en prod: 401 sin auth, dry-run con auth, 0 candidatos hoy (los activos ya completaron). Activar = ver la lista en /admin → poner el flag.
- [x] 📊 **MEDIR — pulso de beta (capa 1, 2026-06-12, PR #124).** Panel `/admin/pulso` + digest semanal. El panel `/admin/trafico` cubre tráfico→conversión; el **pulso** cubre lo que pasa DESPUÉS de llegar: embudo de oferta (**aprobados→registrados→perfil completo→con evento**, con % del paso anterior) + demanda (bookers, bookings, pitches, favoritos) + engagement (eventos públicos, RSVPs) + deltas de 7/30 días. Query `getPulso` (solo counts `head:true`). **Digest semanal `/api/pulso/cron`** (GH Action lunes 09:00 Santiago, `CRON_SECRET`-protected). **✅ ACTIVO (2026-06-30):** `PULSO_DIGEST_TO=hola@jayportu.com` seteado en prod (dry-run confirma `recipients:1`); primer envío disparado a mano y recibido OK por Jaime. De acá corre solo. Para sumar a Fer: agregar su correo con coma al mismo valor.
- [ ] 🤝 **SEMBRAR — Founding Bookers a mano (capa 3, NO automatizar).** Invitar 10–20 bookers reales (clubes/productoras/organizadores) con el token VIP, uno a uno. Concierge a propósito: outreach frío masivo = spam, mata la confianza. Manual de Jaime.
- [ ] 🟢 **Activar la oferta que ya hay (manual, complementa el nudge).** Empujar a los ~13 DJs activos a perfil completo + un evento publicado (cada uno = nodo de distribución hoy).

**✅ Shippeado 2026-06-29/30 — destrabar conversión + activación (capas 1 y 2):**
- [x] 🚀 **DESTRABAR CONVERSIÓN — auto-aprobación same-day (PR #176, en prod).** La fuga #1 (gate de la beta: pedir acceso → esperar aprobación manual → 2º correo) quedó resuelta: al enviar el form de `/beta` el `beta_request` se aprueba al instante y sale el correo con el link de acceso, automático. Gateado por flag `BETA_AUTO_APPROVE_ENABLED` (default OFF en el código). **Pendiente manual:** confirmar que el flag esté en `true` en Vercel para que opere (sin eso, sigue el flujo manual).
- [x] 📊 **MEDIR — funnel de conversión en `/admin/analytics` (PR #175, en prod).** Adquisición → activación dentro del panel de analytics (complementa `/admin/trafico` y `/admin/pulso`). La métrica de activación que importa: % de DJs que publican press kit tras entrar.
- [x] 🤖 **ACTIVAR — secuencia de correos de ciclo de vida (PR #179/#180, en prod, migración 0062).** Los 3 correos que mueven el North Star (DJ con press kit vivo): **E1 bienvenida** (transaccional, al completar el onboarding; one-shot `welcome_email_sent_at`) · **E2 nudge** (el cron que ya existía dormido, copy reescrito al framing "press kit"; sigue gateado por `ONBOARDING_NUDGE_ENABLED`) · **E3 press kit vivo** (transaccional, la 1ª vez que el perfil queda live-ready vía `isPresskitLiveReady`; one-shot `presskit_live_email_sent_at`). Best-effort: si Resend falla no rompe el onboarding/guardado. Copy 100% tuteo chileno; mockups aprobados por Jaime. **✅ VERIFICADO en prod (Jaime, 29–30 jun):** auto-aprobación da acceso al instante; E1 bienvenida y E3 press kit vivo llegan OK. `ONBOARDING_NUDGE_ENABLED=true` confirmado encendido (E2). Tema cerrado.
- [x] 🎨 **Rebrand visual dark — LIVE como DEFAULT en prod (jun 25–30).** El dark es el tema **por defecto para TODOS los usuarios** (PR #167, flip Fase 3: `<html data-theme="dark">` SSR; escotilla a light = cookie de debug, sin toggle en UI — **NO está "detrás de flag"**). Incluye: logo nuevo DROP. en **Satoshi** (#164/#165); **naranjo canónico ahora `#E85A0C`** (reemplazó #FF5C00 en toda la UI app+pública — emails/`/api` siguen #FF5C00 a propósito); landing dark reconstruido con spec `MOCKUP_landing_v2` (#168); polish wordmark themable + foco a11y (#169). **QA de pantallas con login HECHO 30-jun** (dashboard, calendario, perfil+galería, growth, CRM, admin — sin texto invisible ni superficies blancas). **Pendiente (no bloqueante):** checklist de accesibilidad fino (targets ≥44px móvil, role=tab/aria en feature-tabs, aria-hidden en SVG decorativos). **Diferido a post-tracción:** vista **MAPA** del calendario (necesita geocoding de `location`) + **selector de rol** en signup (fotógrafo/audiovisual "próximamente"). Detalle completo: memoria `drop_dark_rebranding` + entregables en `design-audit/`.
- [x] 🆕 **Producto post-dark (jun 28–30, en prod).** Calendario **vista MES** + toggle Lista/Mes (#170) · **galería de fotos** del press kit con carpetas + lightbox, migración 0061 (#172) · aviso al admin solo cuando el correo de aprobación **no** sale (#173) · copy landing quick-wins (#177) · fix de ruido de Sentry del navegador in-app de IG/iOS (#178).

**🔍 Auditoría de portada + legal (2026-06-28) — revisión de 7 puntos de Jaime:**
- [x] 🔴 **#1 · PII del fundador fuera de `/terms`.** ✅ HECHO (PR #174, en prod). La sección "Datos del proveedor" exponía públicamente nombre legal completo + RUT + domicilio residencial + depto. Reemplazado por identificación mínima (persona natural, opera desde Santiago) + "datos completos a solicitud por vía legal" + nota de reemplazo al constituir DROP SpA. Verificado: cero copias públicas del RUT/dirección en `src/` (solo en docs internos no desplegados del Escritorio). **Cuando se constituya DROP SpA, este bloque se llena con los datos de la sociedad (RUT y domicilio de empresa sí son publicables).**
- [x] ✅ **#2 · "directorio próximamente" — NO existe en prod.** Verificado contra `dropgigs.com`: la portada actual (rebrand dark) ya linkea al directorio ("Ver el directorio →") y el FAQ dice "Apareces en el directorio público". Lo que Jaime vio era un **deploy/caché viejo**. Sin acción de código.
- [x] ✅ **#4 · "IA local (Ollama)" — NO existe en prod.** Verificado: cero menciones de IA/Ollama en copy público (la portada nueva ya lo eliminó; Ollama descartado desde Fase 3, ver línea ↑). Era el mismo caché viejo. Sin acción de código.
- [x] 🆕 **#3 · Mostrar el producto en la portada (demo visual).** ✅ **HECHO (2026-06-30).** Sección "Míralo por dentro" (`product-showcase.tsx`, tabs + marco de navegador) con **capturas reales** de 7 pantallas: Dashboard, CRM, Calendario, Press kit, Inbox de bookings, Perfil, Métricas. Assets de la cuenta demo ficticia **NOVA RÍOS** (`seed_demo_account.mjs`, data limpia, oculta del directorio, email `hola@novarios.cl`) capturadas con Playwright + sesión acuñada por magic-link (`scripts/_capture_demo.mjs`, no commiteado). PNGs en `public/landing/product/`. Verificado en preview (7 tabs, imágenes cargan, tab-switch OK). *Futuro opcional: el "loop/demo de 30-45s" en video queda como upgrade; las capturas estáticas ya cubren el objetivo.*
- [x] 🆕 **#5 · Funciones → beneficios en la landing.** ✅ **HECHO (2026-06-30).** Los 6 tabs de `feature-tabs.tsx` reescritos a resultado (tuteo chileno): "No pierdas oportunidades" (CRM) · "Sabes cuánto ganas al mes" (calendario) · "Preséntate profesional en segundos" (press kit) · "Sabes si tu carrera crece" (growth) · "Que te encuentren los bookers" (directorio/Smart Match) · "Que te escuchen sin fricción" (música). El FAQ ya era claridad/beneficio → se dejó.
- [x] 🆕 **#6 · Tooltip de "DJ verificado".** ✅ **HECHO (2026-06-30).** Tooltip `title="Identidad e Instagram revisados por DROP."` + `cursor-help` en el badge de `/p/[slug]` y `/dj`. (El bloque granular Identidad/Redes/Sets del press kit ya existía.)
- [ ] 🟡 **#7 · Auditar afirmaciones legales contra la realidad operativa (con asesor jurídico).** `/privacy:194-249` afirma haber **firmado DPAs** con cada proveedor (Supabase, Vercel, Cloudflare, Resend, Google, MercadoPago) y `/privacy:255-282` describe medidas específicas (RLS, HTTPS forzado, SPF/DKIM/DMARC, cifrado en tránsito/reposo). Verificar que cada afirmación sea literalmente cierta (¿DPAs realmente firmados/aceptados con c/proveedor?). Revisar también retracto, facturación, renovaciones automáticas y plazos bajo la nueva normativa chilena. **No basta con que el texto esté completo; debe reflejar lo que la app hace de verdad.**

**🚪 Onboarding de primera vez del booker (DISEÑADO 2026-06-30 · construir DORMIDO):**
- [ ] 🆕 **Onboarding del booker — recibirlo y llevarlo a completar su ficha.** *(En construcción en otra sesión.)* Hoy un booker invitado cae en `/booker/requests` (inbox vacío) sin que nadie lo empuje a llenar su carta de presentación — que es lo único que hace que un DJ confíe y responda. **Diseño aprobado (mockup):** 3 pantallas en el 1er login (una sola vez):
  1. **Bienvenida** — reconoce estatus Founding + 3 razones (más respuestas · confianza · 2 min); "saltar" siempre disponible.
  2. **Completa tu ficha con PREVIEW EN VIVO** *(el corazón)* — llena bio/web/IG/WhatsApp y ve en tiempo real la tarjeta exacta que verá el DJ. **Reusa el componente real `booker-credibility-card`** (cero backend nuevo) + barra de completitud **espejo de `computeCompleteness`** de DJs. WhatsApp resaltado = el campo que más mueve la aguja.
  3. **Listo → "Buscar DJs"** (no soltarlo en el inbox vacío).
  - **Implementación:** los campos ya existen en `booker_accounts` (bio, website_url, instagram_url, whatsapp, booker_type, city). Solo falta **una columna `onboarding_completed_at`** (one-shot, para que aparezca 1 sola vez) + el flujo UI + cambiar el redirect post-onboarding a `/booker/buscar`.
  - **🔒 PUERTA CERRADA (decisión Jaime):** construir **dormido detrás de un flag `BOOKER_ONBOARDING_ENABLED`** (mismo patrón que `ONBOARDING_NUDGE_ENABLED` / digest del pulso). Mientras los bookers estén en pausa → flag en `false`, experiencia actual sin cambios. Se "abre la puerta" al empujar bookers, sin deploy nuevo.

- [x] 📉 **Pulso de beta · diagnóstico (2026-06-12).** Cruce read-only (`scripts/pulso_beta.mjs`): ola 1 entregó ~705 y convirtió **~0 cuentas** (0 signups, 3 beta_requests de la lista). **La fuga NO es alcance — es la fricción del signup gated** (el CTA fue `/beta` = pedir acceso + esperar aprobación manual + 2º correo). Ver [[pulso-beta-conversion]] en memoria.
- [x] 🔧 **Fix de fricción + ola 2 preparada (2026-06-12).** Se reusó el flujo vivo `/login?invite=<token>` (sin código nuevo): **809 DJs pre-aprobados** con link mágico de 1 clic (lista limpiada: 9 typos `.con→.com`, basura + dedup). 80% Gmail → "Continuar con Google" = 1 clic. Mockups aprobados (`drop_ola2_invitacion_nuevos_mockup.html` con asunto A; reactivación). Sender `scripts/send_ola2.py` (per-recipient link + respeta bajas). **Pendiente disparar:** test 50 → 70/día (post 15-jun; ola 1 termina ~15-jun).
- [x] 🚫 **Lista de bajas (PR #120, prod 2026-06-12).** `email_suppressions` + `/admin/bajas` (un solo lugar) + webhook auto-suprime rebotes/quejas/"bajar" + `/api/unsubscribe?email=` real + link de baja por persona. Migración 0052 (sembró 48 rebotes ola 1). Los senders consultan la lista siempre.
- [x] 🔁 **Reactivación beta inicial ENVIADA (2026-06-12).** 9 testers reales (excluido admin/Fer/test/bajas) → link a `/login`, asunto "lo que nos pediste ya está en DROP.". 9/9 entregados, 0 rebotes. *(Decisión: el "bloqueo automático al mes/15 días" NO existe aún — billing en stand-by; corte manual para pocas cuentas. Construir el corte real = mini-dev pendiente si se quiere para los 809.)*
- [x] 🎨 **Landing UX — fixes quirúrgicos de conversión (HECHO 2026-06-12 · PR #122, en prod).** P1+P2+P3 aplicados y verificados a 380px. **Decisiones de Jaime:** umbral línea de tracción **≥25 DJs** (hoy 13 → oculta); titular capa final **"Tu press kit, tus fechas, tu data."** Resultado: header con CTA "Soy DJ"→/beta + "Entrar" link; `/dj` adopta SiteHeader/SiteFooter (viaje booker arreglado); barra de búsqueda = Link real; SUENA AHORA 4 en móvil foto-first; ranking solo si `mode==="followed"`; badges unificados; nombre dominante + género gris (AA); `scroll-mt` en anclas; `sizes` 50/33vw. Detalle del análisis original abajo ↓.
  **Hallazgos clave:** (1) la barra "Busca por sonido o ciudad…" del hero es un span muerto, no clickeable; (2) viaje booker roto: `/dj` tiene header propio sin nav, logo → /dj y único CTA "SOY DJ · CREAR PERFIL"→/login (audiencia Y destino equivocados — el signup DJ está gateado por /beta); (3) fatiga de descubrimiento: 3 módulos seguidos con los mismos DJs repetidos, 6/8 cards sin foto (pared de iniciales), ~8 pantallas de scroll en móvil; (4) badges mezclan semánticas + "Disponible" crema sobre foto sin scrim = ilegible (lenguaje distinto entre / y /dj); (5) titular "Toma el control de tu carrera." duplicado (hero + capa final); (6) cero tracción cuantificada (la data ya existe: `listPublicDjs`/`listPublicCities`/`listPublicGenres`); (7) anclas del nav (`/#conexion`, `/#incluye`) quedan tapadas por el header sticky (sin `scroll-mt`); (8) naranjo #FF5C00 sobre blanco/crema = 3:1, falla AA en texto chico.
  - **P1 · conversión:** barra de búsqueda → Link real a /dj · /dj adopta `SiteHeader`/`SiteFooter` · SUENA AHORA 4 cards en móvil (8 desktop) con foto-first · ranking solo si `mode === "followed"` (el fallback "Destacados" duplica a DROP. RECOMIENDA) · línea de tracción en el hero gateada por umbral · CTA header "Soy DJ"→/beta + "Entrar" degradado a link.
  - **P2 · jerarquía:** badges unificados ("★ Disponible" sólido en ambas páginas; "Nuevo"/"Internacional" secundarios blanco/tinta) · nombre del DJ dominante en cards (Anton 20px uppercase; género en gris — arregla el AA) · titular nuevo en capa final · h1 sin `<br/>` en móvil · `scroll-mt-[78px]` en secciones ancladas.
  - **P3 · higiene:** puertas del hero h3→h2 · `truncate` en nombre de SuenaCard · `sizes` 50vw en DjCard de /dj (hoy baja imágenes 2× en móvil → egress) · chips del hero sin falso-activo.
  - **⚠️ 2 decisiones de Jaime antes de codear:** (a) umbral de la línea de tracción (propuesto: mostrar solo con ≥25 DJs); (b) copy del titular de la capa final (propuesto: "Tu press kit, tus fechas, tu data.").
  - **Flujo acordado:** rama nueva (no main) → aplicar P1+P2+P3 → verificar a 380px en preview → `npm run build` antes del push → PR.

**Siguiente paso — RETOMAR (post 2026-06-11):**

> **Estado al cierre del 2026-06-11:** producto construido, blindado y con **analítica + cara de fans** lista. Listo para meterle tracción.
>
> **✅ Cerrado el 2026-06-11:**
> - **Admin UX** (PR #83): nav fija en el backoffice + Eliminar cuenta + diálogos/botones unificados.
> - **Analítica híbrida**: Vercel Web Analytics (PR #82/#84) + panel propio `/admin/trafico` con registrados-vs-anónimos + embudo de conversión (PR #85, migración 0050 en prod).
> - **Feed de eventos para fans** `/eventos` + sección en el landing (PR #86) — lo que ven los fans sin cuenta.
> - **🐛 Fix:** RA-7 estaba roto para fans anónimos en prod (`/e/`, `/api/event-rsvp`, `/eventos` daban 307→login). Corregido en el mismo PR #86.
>
> **⚠️ Verificar:**
> 1. **Web Analytics** ✅ encendido y verificado (`/_vercel/insights/script.js` → 200).
> 2. Probar el **flujo de fan real en prod** (sigue pendiente): un DJ publica un show → abrir `/e/<token>` en incógnito (sin login) → hacer RSVP → confirmar que ya **no** rebota a /login. Valida el happy path que el classifier no me dejó sembrar localmente.
>
> **▶ Estado al 2026-06-30:** fase **TRACCIÓN**. La fuga #1 (gate de la beta) quedó cerrada con **auto-aprobación same-day (#176)**, y la capa de activación está en prod **y verificada** (Jaime, 29–30 jun): **funnel de conversión (#175)** + **correos E1 bienvenida / E2 nudge / E3 press kit vivo (#179/#180)** + pulso (#124) + landing UX (#122). Flags ON confirmadas: `BETA_AUTO_APPROVE_ENABLED`, `ONBOARDING_NUDGE_ENABLED`, `PULSO_DIGEST_TO` (digest del pulso activo, 1er envío recibido 30-jun). **Pendiente:** empujar a los ~13 DJs a perfil completo + 1 evento (manual). En pausa: Founding Bookers. Siguiente candidato de producto: **#3 demo visual de la portada** (ver auditoría ↑).
>
> **Web Analytics:** ✅ ya encendido por Jaime (2026-06-11, verificado en prod: `/_vercel/insights/script.js` → 200).
>
> **Pendiente que depende de ti (cuando quieras encender):**
> - **El nudge de onboarding**: ver la lista en `/admin` → pestaña "Nudge", luego `ONBOARDING_NUDGE_ENABLED=true` en Vercel.

**En stand-by (decisiones tomadas):** **Fase 4 · suscripción** (hasta fin de beta) · DROP no intermedia pagos booker↔DJ (descartado) · 2FA (descartado) · M10 double opt-in del fan (diferido a escala). **Backlog:** v2 parte 2 (embeddings), sueltos de Fase 5 (S22/música/Productor), RA-4.

---

## 🎯 CÓMO RETOMAR — Resumen de sesión 2026-05-29

> ⤴️ **Superado por el PLAN DE TRABAJO ACTUAL de arriba (2026-06-04).** Se mantiene como historial de la sesión de mayo.

**Estado al cierre**: todo lo de las sesiones de mayo está deployado a `main`.

### Live en prod
- ✅ Sprints **RA-1** (perfil pro: stats + booking info) y **RA-3** (seguir + notif por email) cerrados.
- ✅ **Sprint S19 (Suscripción MP)** code-complete en 4 fases. F2 visualmente verificado en localhost; F3 (checkout MP) verificación end-to-end **diferida a prod**. Ver sección 12.
- ✅ Mobile rework: BottomNav → menú desplegable con todos los items.
- ✅ Iconos lucide en sidebar con slide-in.
- ✅ Deuda técnica barrida (`created_contact_id` auto-promote, `/growth/ads` rename, etc).
- ✅ Migraciones en prod: `0023` (admin Fer), `0024` (avatar), `0025` (press-kits 25MB), `0026` (follow_notifications), `0027` (dj_update_events), `0028` (subscriptions).
- ✅ Beta legacy users (9 actuales) **NO se ven afectados** por ningún cambio nuevo — su flow original se mantiene hasta que la beta termine.

### Próximo sprint sugerido (cuando quieras)
**RA-2 Parte A · DROP Picks** (~3-4h, bajo riesgo) — fila curada de DJs destacados en `/dj` con toggle ⭐ desde admin. Detalle en sección 11.

### Decisiones abiertas que destraban sprints
- **🎯 Capa 1 · MODELO DE MONETIZACIÓN — POR DECIDIR (estratégico, no código).** Tras shippear la **Capa 2** (features de presskit para igualar/superar al competidor: tech rider visual, catálogo música, disponibilidad por fecha — PR #148, en prod 2026-06-19) y revisar **readytoplay.club** (competidor 1:1 en Chile: **gratis para el DJ + 5% comisión por booking**, sin suscripción), toca revisar **cómo cobra DROP**. Hoy: suscripción DJ $9.990/mes (Fase 4, en pausa) — pero la ola 1 convirtió ~0 (la fuga es el muro de pago + signup gated). **Opciones a comparar lado a lado:** (a) mantener suscripción con **tier free de entrada**; (b) **gratis + comisión cobrable** (estilo Fintoc) en vez de suscripción; (c) híbrido. Trade-off: su 5% es casi inexigible (pago directo → disintermediación), pero su modelo gratis baja la fricción de entrada; nuestra suscripción es cobrable pero frena adquisición. **Próximo paso: armar las opciones con números antes de tocar código.** (Contexto completo: memoria `competidor_readytoplay`.)
- **Q02** Firma electrónica (define S18.5) — simple click-wrap recomendado.
- **Q03** Gateway de pago: ✅ **decidido MercadoPago** (S19 ya construido, esperando prod).
- **Lanzar registro de Booker** (backend listo, hoy en "Próximamente").

### Para retomar S19 cuando salga el sitio oficial
Ver sección 12. En resumen, 5 pasos:
1. Cambiar credenciales MP de TEST → PROD en Vercel.
2. Configurar webhook URL en MP panel.
3. Generar `MP_WEBHOOK_SECRET`.
4. Probar con tarjeta real (cobro mínimo refundable).
5. Activar.

### Activos útiles para próximas sesiones
- **Script de user fantasma**: `scripts/setup_trial_test_user.mjs` — crea/refresca user con `beta_status='none'` para testear el flow nuevo de trial+suscripción. Credenciales:
  - Email: `trial-test@dropdj.local`
  - Password: `DropTrial2026!`
  - User ID: `621a56ac-a23a-473c-9025-77e4c1c5e1dc`
- **Mockups HTML para revisar UX antes de codear**:
  - `drop_sidebar_icons_mockup.html` (iconos sidebar — implementado)
  - `drop_ra3_seguir_notif_mockup.html` (RA-3 — implementado)
  - `drop_ra3_email_preview.html` (email RA-3 — implementado)
  - `drop_s19_onboarding_suscripcion_mockup.html` (S19 7 pestañas — implementado)
  - `~/Desktop/drop_journey_pago_suscripcion.html` (S19 journey linear para Fer)

### Lecciones aprendidas (memoria persistente)
- **Tuteo chileno siempre** — `tono_drop.md` en memoria. Nunca voseo argentino.
- **Antes de push a main correr `npm run build`** — `tsc --noEmit` no atrapa errores de ESLint. Y **detener el preview server antes** porque pisa el `.next` y rompe el dev. Ver `vercel_build_lesson_drop.md`.
- **Working style**: estructurar en capas, una decisión a la vez, un solo siguiente paso. No abrumar. Ver `feedback_working_style_drop.md`.

---
>
> Última actualización: 2026-05-28 (noche)
> Última actualización: 2026-05-29
> Estado git: Bloques B + C mergeados. Migraciones `0023` (admin Fer), `0024` (avatar), `0025` (press-kits 25MB), `0026` (follow_notifications), `0027` (dj_update_events) y `0028` (subscriptions) corridas en prod. **Sprints RA-1 y RA-3 cerrados · S19 Suscripción MP code-complete (verificación de checkout diferida a prod, ver nota abajo) · barrido completo de deuda técnica · mobile rework · iconos sidebar slide-in.** Siguiente sprint sugerido: **RA-2 Parte A · DROP Picks** (~3-4h, bajo riesgo).

---

## 0 · Estado actual de DROP.

### Cerrado y deployado a `main` (mergeado 2026-05-26)
- **Bloque A · Cleanup pre-RTP features** (`61b7872`)
- **Bloque B · Landing DJ/Booker + cuentas de Booker** (`7bcd902`)
- **Bloque C ≈ Sprint 18 · Booking state machine + counteroffer + timeline + push** (`1684ef7`)
- **Fix tono · voseo argentino → tuteo chileno** (`686e7b2`)
- **Booker en "Próximamente"** — registro deshabilitado hasta lanzamiento; `/dj` sigue navegable y los requests por perfil funcionan (`af07ee8`)
- Merge `--no-ff` a `main` (`4eb9476`) + migraciones 0021 y 0022 corridas en Supabase prod + deploy en Vercel verificado.

### Pendiente inmediato
- Nada operativo abierto. La app corre end-to-end en prod.
- Próximo: **decisiones de Capa 2** (ver sección 6) antes de abrir S18.5 (Contratos) y S19 (Pagos).

### Booker en "Próximamente" — qué incluir al lanzar el registro

El registro de bookers está **deshabilitado** (landing y `/signup/booker` muestran "Próximamente"). El backend YA está construido; esto es lo que el perfil del booker debe contemplar **cuando se decida lanzar**.

**Ya construido (no rehacer):**
- Tabla `booker_accounts` (migración `0021`) con: `full_name`, `email`, `booker_type`, `city`, `country`, `whatsapp`, `newsletter_optin`, timestamps.
- 8 tipos de booker: venue/club/bar · productora · agencia de booking · evento privado · casamiento · corporativo · festival · otro.
- Formulario `/signup/booker` (hecho, solo oculto) que captura: nombre, email, password, tipo, ciudad.
- Flujo completo: signup → email confirm → portal `/booker` (favoritos, requests, calendario) + claim de bookings huérfanos por email + vista pública tokenizada `/b/[token]`.

**Capturado en el schema pero que el form NO pide aún (decidir si sumar al lanzar):**
- `country` (país)
- `whatsapp` (para que el DJ pueda responder fuera de la app)
- `newsletter_optin` (opt-in de marketing)

**Decisiones pendientes antes de lanzar:**
- ¿Qué campos son obligatorios vs opcionales? (hoy: nombre obligatorio; tipo y ciudad opcionales)
- ¿Pedir WhatsApp en el signup?
- ¿Verificación de email obligatoria antes de poder mandar un request?
- ¿Anti-spam / rate limit en el signup abierto? (riesgo de cuentas falsas en registro público)
- ¿Mostrar el opt-in de newsletter en el form?
- ¿Cuándo lanzar? Depende de tener suficientes DJs en el directorio `/dj` para que la cuenta de booker valga la pena.

---

## 1 · Roadmap pendiente (orden post-RTP review)

| # | Sprint | Estado | Estimado |
|---|---|---|---|
| **S18.5** | Contratos digitales con firma electrónica simple | 🔜 siguiente | 4-5 días |
| **S19** | Pagos integrados Flow + MercadoPago | ⏳ | 5-7 días |
| **S20** | Marketplace v2 · `/dj` filtros pro + calendario público + sitemap | ⏳ | 3 días |
| **S20.5** | Cotizador público (toggle por DJ) — *opcional* | ⏳ | 2 días |
| **S21** | Operación del show (tech rider editor + tracklists post-show) | ⏳ SQL ya migrado | 3 días |
| **S22** | Campañas + Ads tracker (Meta/Google, ROI por campaña) | ⏳ desplazado desde S18 | 4-5 días |
| **S23** | IA en mails + bio adaptable (Ollama clasifica Gmail) | ⏳ | 3-4 días |
| **S24** | Música personal (biblioteca de tracks + wantlist) | ⏳ | 3 días |
| **S25** | Modelo de membresías + dominio propio + sitio legal | ⏳ renumerado desde S24 | 5-7 días |

**Total estimado restante:** ~33-43 días de trabajo (sin contar revisiones / bugs / pulido).

### Descartado explícito (NO volver a proponer)
- Spotify auto-sync
- Soundeo integration
- Automatización de posteo en redes
- WhatsApp automation / Baileys
- Sprint 22.5 · Instagram auto-sync vía Meta Graph API (pospuesto indefinidamente)
- **Pagos integrados booker↔DJ (Idea 3 / "cobrar la seña" vía Flow/MP)** — DESCARTADO 2026-06-08. DROP no intermedia el pago entre booker y DJ ni se responsabiliza de él; ese pago va directo y no pasa por DROP. El ÚNICO cobro de DROP es la suscripción del DJ.
- **2FA para usuarios (Supabase TOTP)** — DESCARTADO 2026-06-10. Fricción > beneficio para cuentas de DJ/booker (setup con app autenticadora, paso extra en cada login, riesgo de bloqueo). Ya hay reset de contraseña + login Google (2FA propio) + moderación. Eventual excepción: solo cuentas admin. (Nota: la línea ~652 dice "2FA disponible" como capacidad técnica de Supabase — eso es solo informativo, NO un pendiente.)

---

## 2 · Las 5 ideas que agregamos (RTP review)

### Idea 1 · Booking State Machine completa ✅ HECHO (Bloque C)
- Estado `contraofertado_por_booker` + monto/fecha alternativos
- Timeline visible con timestamp y autor
- Notificaciones push + mail automáticas
- Vista pública booker tokenizada `/b/[token]`
- KPIs: conversión por estado, tiempo promedio por paso

### Idea 2 · Contratos digitales con firma electrónica → S18.5
- **Qué suma:** cerrar el booking dentro de DROP., sin PDFs por WhatsApp/mail
- **Por qué importa:** cierra brecha #1 vs RTP. Ley 19.799 valida firma electrónica simple en Chile
- **Funciones:**
  - Plantillas de contrato con variables (reutilizar Sprint 5)
  - Auto-generación al pasar booking a `accepted`
  - Firma click-wrap: checkbox + IP + UA + timestamp → hash SHA256
  - PDF firmado en Supabase Storage, accesible ambas partes
  - Audit log: quién firmó, cuándo, desde dónde
  - Futuro: integración HelloSign / Firmavirtual.cl (avanzada)
- **Riesgo:** UI debe ser clara — es **simple**, no avanzada. Sirve 90% de casos, no notariales.
- **Complejidad:** Media · **Depende de:** Idea 1 ✅ · **Estimado:** 4-5 días

### ~~Idea 3 · Pagos integrados Flow + MercadoPago → S19~~ · ❌ DESCARTADO (2026-06-08)
> **DROP no intermedia el pago booker↔DJ** (decisión 2026-06-08). El cobro de DROP es solo la suscripción del DJ. Lo de abajo queda como referencia histórica.
- **Qué suma:** cobrar la seña dentro del sistema (segundo dolor LATAM)
- **Por qué importa:** sin pago integrado el flujo queda "casi cerrado pero no"
- **Funciones:**
  - Integración **Flow** (Chile primero) + **MercadoPago** (LATAM)
  - Config por DJ: % de seña (ej. 30%) + saldo post-evento, o pago total
  - Link de pago al pasar booking a `contracted`
  - Webhook sincroniza estado: pendiente → pagado → reembolsado
  - Voucher PDF auto-generado para el booker
  - Dashboard DJ: recibidos, pendientes, por cobrar
  - **Sin escrow real** — el DJ recibe directo en su cuenta gateway, DROP. no maneja plata
- **Costo para DROP.:** $0 (comisión la cobra Flow/MP al DJ, ~3%)
- **Complejidad:** Alta · **Depende de:** Ideas 1+2 · **Estimado:** 5-7 días

### Idea 4 · Calendario público de disponibilidad → S20
- **Qué suma:** vista calendario en `/p/[slug]` mostrando libre/ocupado/tentativo
- **Por qué importa:** filtra leads tempranos. El booker no pide si ve "ocupado"
- **Funciones:**
  - Vista calendario embed en `/p/[slug]` (mes con colores por estado)
  - Estados por fecha: disponible / ocupado / tentativo / bloqueado
  - Auto-fill desde `calendar_events` (link Sprint 20 ya existe)
  - Manual override del DJ por fecha
  - Modo privacidad: mostrar "ocupado" sin revelar evento
  - Sync con Google Calendar (si Sprint 7 está listo)
- **Reutiliza:** `calendar_events` + `available_from/until/note` (migración 0018) ya existen. Es 90% UI + query.
- **Complejidad:** Baja-Media · **Depende de:** Sprint 7 · **Estimado:** 2-3 días

### Idea 5 · Cotizador público (pricing transparente) → S20.5 *opcional*
- **Qué suma:** tarifa o rango visible en press kit → booker estima antes de mandar request
- **Por qué es opcional:** muchos DJs prefieren NO mostrar pricing (negociación, segmentación venues). **Debe ser toggle por DJ.**
- **Funciones:**
  - Tarifa base por tipo evento (club / privado / corporativo / festival)
  - Modificadores: duración, hora extra, traslado, equipo extra
  - Calculadora interactiva en press kit
  - Toggle "mostrar pricing público" en `/configuracion`
  - Modo "consultar tarifa" si está off
- **Lectura:** el menos urgente. Sumar después de Ideas 2-3 sólo si Jaime decide mostrar pricing en su propio press kit.
- **Complejidad:** Baja · **Sin dependencias** · **Estimado:** 2 días

---

## 3 · Falencias técnicas detectadas (sección 04 del plan)

| # | Falencia | Severidad | Mejora propuesta |
|---|---|---|---|
| 01 | Booking workflow lineal, no bidireccional | 🔴 Crítica | ✅ resuelto por Idea 1 (Bloque C) |
| 02 | `/api/booking` no crea contacto, pero S20 sí crea follow-up auto | 🟡 Inconsistencia | Política única: auto-crear contacto al pasar a `leido`, mantener auto follow-up |
| 03 | No hay contratos ni pagos (gap RTP) | 🔴 Crítica | Ideas 2 (S18.5) + 3 (S19) |
| 04 | `presskit_events.event` tiene 11 valores hardcoded en CHECK | 🟢 Descartado | `trackEvent()` ya valida vía `PresskitEventType`; el CHECK queda como belt-and-suspenders contra typos en los 2 inserts directos (counter_submitted/_accepted) |
| 05 | No hay `sitemap.xml` ni `robots.txt` explícito | ✅ Hecho | `src/app/sitemap.ts` + `src/app/robots.ts` existen |
| 06 | Disponibilidad existe en data, no en UI pública | 🟡 Feature incompleta | Idea 4 (S20) |
| 07 | 21 migraciones para una app personal — SQL adelantado al frontend | 🟢 Deuda técnica | Auditar columnas/tablas 0017-0020 sin UI consumidora. Cerrar UI o quitar SQL |

---

## 4 · Redundancias / cosas sin sentido (sección 05 del plan)

| # | Problema | Severidad | Fix |
|---|---|---|---|
| 01 | Dos rutas a campañas: `/campanas` y `/growth/campanas` | 🔴 UX confuso | Consolidar en `/campanas` con tabs "Outbound" / "Growth/Ads" |
| 02 | README vs NEXT_SESSION desincronizados sobre sprints | 🔴 Docs | Consolidar NEXT_SESSION como source-of-truth, eliminar sección "Roadmap actual" del README |
| 03 | 3 entry points públicos: `/login`, `/welcome`, `/beta` | 🟡 Flujo poco claro | Definir gate beta abierta/cerrada. Si abierta: eliminar `/beta`. Si cerrada: redirect `/login` → `/beta` |
| 04 | `created_contact_id` en bookings nunca se popula desde el form | ✅ Hecho (commit por venir) | Ahora se auto-popula al pasar a cualquier estado "trabajado" (leido, respondido, cotizado, contraofertado, agendado). Antes solo cotizado. |
| 05 | "Sprint 18" en NEXT_SESSION ≠ "Sprint 18" en migraciones | 🟡 Confusión estructural | Alinear nombre de sprint con número de migración, documentar la convención |

---

## 5 · Quick wins de tráfico / SEO (sección 02 del plan)

Ya tenés: slug + OG + tracking + `/dj` directorio. Faltan:

- [ ] **QR generator integrado** en `/press-kit` (light/dark, PNG+SVG, branded DROP.) — librería `qrcode` npm, ~1 hora
- [ ] **UTMs preconfigurados** — botón "copiar link con UTM" por fuente (IG bio, WhatsApp, mail firma, Resident Advisor…). Extender `presskit_events.metadata`
- [ ] **Embed widget para venues/agencias** — ruta `/p/[slug]/embed` minimal con foto + tagline + CTA, snippet copy-paste. ~1 día
- [x] **Sitemap.xml + robots.ts** — ✅ YA hechos (`src/app/sitemap.ts` con /, /dj, /eventos + 1 URL por DJ público `/p/[slug]`; `src/app/robots.ts`). `/eventos` agregado 2026-06-11. *(El roadmap los tenía mal como pendientes — corregido en el repaso.)*

---

## 6 · Decisiones abiertas (sección 07 del plan)

Las 5 preguntas que definen el próximo commit:

### 01 · ¿Priorizamos bloque RTP (Ideas 1+2+3) sobre Campañas?
- [x] **Sí — bloque RTP primero, Campañas se mueve a S22** ← decisión implícita por Bloques A/B/C ya hechos
- [ ] No — Campañas/Ads se mantiene S18, RTP después
- [ ] Solo Idea 1 (state machine), Ideas 2-3 después

### 02 · ¿Firma electrónica?
- [ ] Simple (click-wrap + hash) — gratis, Ley 19.799 ← **recomendado por el plan**
- [ ] Avanzada desde día 1 (HelloSign / Firmavirtual.cl)
- [ ] Híbrido: simple por default, avanzada como upsell

### 03 · ¿Pagos: Flow primero o MercadoPago primero?
- [ ] Flow (Chile, tu mercado primario)
- [x] **MercadoPago** ← decisión tomada e implementada: es el único riel integrado (`/api/mp/webhook` + preapproval S19, suscripción del DJ). Flow NUNCA se integró. *(El cobro en sí sigue en pausa — Fase 4 stand-by — pero el riel ya está elegido.)*
- [ ] Ambos en paralelo (más complejidad)

### 04 · ¿Cuenta de booker?
- [x] **B · cuenta liviana opt-in (recomendado)** ← decisión implícita por Bloque B ya hecho
- [ ] A · sin cuenta (mantener actual)
- [ ] C · two-sided desde login (marketplace)

### 05 · ¿Cotizador público (Idea 5)?
- [ ] Sí — toggle por DJ, S20.5
- [ ] No — negociación privada siempre
- [ ] Después, cuando haya feedback de Fernanda

---

## 7 · Cosas que sumamos fuera del plan original (durante Bloques A/B/C)

- **Email deliverability** — anti-spam compliance (commit `c2e5a0b`)
- **Beta onboarding fix** — 4 bugs críticos del flow signup/activación (`84bac3e`)
- **Invite flow fix** — `cookies().set` en server component rompía con 500 (`23b8b52`)
- **UI Alignment Sprint** — alinear pantallas con mockups brutalist (`be1bfa1`)
- **Sprint 23.5 Fase I** — Lockout post-beta día 15+ (`4e72824`)
- **Sprint 23.5** — Beta 15 días: acceso anticipado + feedback + NPS + analytics (`697b5aa`)
- **Sprint 23.5** — Email automático Resend + activación beta al login (`c75015b`)
- **UX raíz** — visitantes anónimos van a `/beta`, no a `/login` (`2055d40`, `63ac0d8`)
- **Firma email beta** — "Jaime" → "DROP. Team" con punto naranja (`bf26cc8`)
- **PNG story tracklists** — edge + 540×960 + sans-serif (`3b9387a`)
- **Fix tono global** — voseo argentino → tuteo chileno (`686e7b2`)
- **Mockups visuales generados** (no son código de la app pero existen en repo):
  - `drop_app_mockup.html`, `drop_dashboard_mockup.html`, `drop_brandbook.html/pdf`
  - `drop_logo_v1.html`, `drop_url_preview.html`, `drop_vs_readytoplay.html`
  - `drop_reels_beta_mockups.html`, `drop_reel_render.html` + `drop_reels_output/*.mp4`
  - Sprint 18-21 mockups + sprint 23.5

---

## 8 · Siguiente acción sugerida

✅ **Capa 1 cerrada (2026-05-26):** booker en "Próximamente" + merge a `main` + migraciones en prod + deploy verificado.

**Lo que sigue — Capa 2 (decisiones, sin código):** resolver Q02 (firma electrónica) y Q03 (gateway de pago) de la sección 6. Esas dos definen cómo se diseñan S18.5 (Contratos) y S19 (Pagos). Una vez decididas, se abre S18.5.

**Limpieza opcional de orden** (sección 9): deuda técnica documentada que no bloquea. Atacar solo en sesiones cortas de orden o cuando se toque esa sección en un sprint.

---

## 9 · Deuda técnica de orden (no bloquea, documentada)

Las 5 inconsistencias de las secciones 4 originales. Ninguna rompe la app. Se resuelven cuando se toca esa sección o en una sesión dedicada a orden.

| # | Tema | Estado |
|---|---|---|
| 02 | Docs desincronizados (README / NEXT_SESSION / roadmap) | ✅ resuelto 2026-05-26 — este doc es la fuente única; NEXT_SESSION borrado |
| 05 | Convención sprint ↔ migración | ✅ documentada abajo |
| 04 | `created_contact_id` nunca se popula desde el form | ✅ resuelto 2026-05-28 — auto-promueve a contact en leido/respondido/cotizado/contraofertado/agendado (`presskit.ts`) |
| 01 | Dos rutas a campañas: `/campanas` y `/growth/campanas` | ✅ resuelto 2026-05-28 — renombrado `/growth/campanas` → `/growth/ads` (URL + label "Ads"). Redirect permanente del path viejo en `next.config.mjs`. `/campanas` queda solo para outbound (mensajes a contactos del CRM). |
| 03 | 3 entry points públicos: `/login`, `/welcome`, `/beta` | ✅ resuelto vía **señalización suave** — el `LoginForm` ya tiene cross-link "¿Aún no tienes cuenta y eres DJ? → Solicitar acceso a la beta" al pie (Sprint 23.5). Versión "fuerte" (redirect automático) descartada — la suave alcanza para la beta cerrada. |

### Convención sprint ↔ migración (fix #05)

No hay mapeo 1:1 entre "sprints" y números de migración. Son dos sistemas distintos:

- **Migraciones** (`supabase/migrations/NNNN_descripcion.sql`): orden secuencial de 4 dígitos, una por cambio de schema. Es el orden **autoritativo** del SQL. Hoy van de `0001` a `0025`.
- **Sprints / Bloques** (S0…S25, Bloques A/B/C): unidades narrativas de planificación. Un sprint puede tocar varias migraciones o ninguna.
- **Para encontrar el SQL de un feature:** leer el comentario de cabecera de cada migración (cada archivo documenta a qué Bloque/Sprint pertenece) o `grep` en `supabase/migrations/`.

Ejemplo: Bloque B → `0021`, Bloque C → `0022`. El "Sprint 18" narrativo ≈ Bloque C en migraciones.

---

## 10 · Visión post-MVP (largo plazo · SaaS para DJs)

> Movido desde el README para que toda la planificación viva en un solo lugar.
> **Nada de esto se implementa ahora** — queda registrado para no olvidarlo.
> Se evoluciona hacia SaaS recién cuando el producto demuestre valor con los beta testers.

### Modelo de monetización
- Free tier: hasta X contactos, sin IA local, press kit con marca
- Plan Pro mensual: ilimitado, integración Gmail/Calendar, Ollama, sin marca
- Plan Team: workspaces compartidos para manager + DJ

### Cambios técnicos necesarios
1. **Workspaces / Teams** — tablas `workspaces` + `workspace_members`; RLS pasa de `user_id = auth.uid()` a `workspace_id IN (mis workspaces)`; migración que mueve la data actual a un workspace por user.
2. **Plans + billing** (cuando se pueda pagar Stripe) — Stripe Subscriptions + webhooks; tabla `subscriptions`; gates por plan en queries.
3. **Onboarding multi-DJ** — landing neutra, selector de tema/branding por workspace, logo propio en Storage, slug per-workspace.
4. **Branding configurable** — `<Logo />` lee `workspace.logo_url`; accent color configurable.
5. **Permisos granulares** — roles owner / editor / viewer; owner ve billing.
6. **Marketing y SEO** — landing con value prop (decisión actual: split DJ/Booker), pricing page, blog/recursos.

### Por qué la arquitectura ya está lista
- ✅ RLS en todas las tablas · ✅ Auth Supabase (escala a miles free) · ✅ Press kits con slugs únicos
- ✅ Directorio público `/dj` con filtros · ✅ IA híbrida (Ollama local + opción OpenAI) · ✅ Sitemap + robots.txt · ✅ Emails anti-spam

---

## 11 · Features inspiradas en Resident Advisor (RA review · 2026-05-27)

Review completo de `es.ra.co` para traer a DROP. lo que aplica al modelo (OS de gestión para DJs/bookers en Chile). Las 4 seleccionadas, ordenadas de quick-win a estructural:

| # | Feature | Qué suma | Estado | Esfuerzo |
|---|---|---|---|---|
| **RA-1** | Perfil + booking info | Bloque de stats de credibilidad (ciudades/venues/shows tocados, derivados de `calendario`) + módulo de reserva destacado en `/p/[slug]`, estilo página de artista RA | ✅ **HECHO** (commit `a1d2ff3`) | Bajo |
| **RA-3** | Seguir + notificaciones | Toggle "Seguir con avisos" en el press kit + feed `/booker/seguidos` con borde naranja en no leídas + cron diario que manda email digest a followers. Migraciones `0026` + `0027` + GH Action. | ✅ **HECHO** (commits `f1ef4e5` → `e539b72`) | Bajo-medio |
| **RA-2 · A** | DROP Picks (curado admin) | Fila "DROP PICKS" arriba de `/dj` con DJs marcados manualmente por el admin. Columna `is_drop_pick` + `drop_pick_priority` en `dj_profile`. Toggle ⭐ en `/admin`. Badge naranja "PICK" en las cards públicas. | ⏳ **siguiente sugerido** | ~3-4h |
| **RA-2 · B** | "Para ti" (recomendaciones) | Tab "Para ti" en `/dj` para bookers logueados, sugiriendo DJs por géneros/ciudad de sus favoritos. Requiere data suficiente para no salir vacío. | ⏳ **diferido** (esperar más uso real) | ~4-5h |
| **RA-4** | Panel multi-entidad | Una cuenta administra varios DJs (manager/agencia), estilo RA Pro. Toca el modelo `user_id ↔ dj_profile` 1:1, RLS y casi todas las queries | ⏳ | Alto |

**Descartado del review RA (no replicar):** ticketing propio (mejor integrar Passline/PuntoTicket), revista editorial, podcast/reseñas, reventa, producir eventos propios, base global de artistas / multi-idioma. Razón: fuera del core de un OS de gestión y/o desproporcionado para la etapa.

### Entregado

#### Perfil + foto + IA del editor
- ✅ **Foto de perfil (avatar)** — Subida en `/perfil` con preview circular; visible en hero del press kit (circular, borde naranja) y sidebar (reemplaza la inicial). Click en cualquiera abre **lightbox a tamaño real** (modal brutalist, ESC/click fuera para cerrar).
  - Migración `0024_avatar.sql`: columna `avatar_url` + bucket Storage `avatars` (5 MB, jpg/png/webp).
  - Componente compartido `src/components/avatar-lightbox.tsx`.
- ✅ **Perfil separado de Configuración** — Ruta propia `/perfil` con el formulario de identidad. Configuración queda solo con ajustes/integraciones.
  - Entrada: el bloque avatar+nombre del sidebar (abajo-izq) es clickeable → `/perfil`.
  - Archivos movidos: `profile-form`/`avatar-upload`/`avatar-actions` → `perfil/`.
  - ⏳ Pendiente menor: en mobile no hay acceso directo en BottomNav (sí por URL).

#### Sprint RA-1 · Perfil pro (cerrado 2026-05-28)
- ✅ **T1** `getPublicGigStats(userId)` — service-role sobre `calendar_events` type='show'. Devuelve shows pasados, lugares distintos, año del primer show y próximos (máx 5). Sin gigs → fallback automático en el caller.
- ✅ **T2** Bloque stats data-driven en `/p/[slug]`: si el DJ tiene shows, muestra **SHOWS · LUGARES · DESDE**; si no, fallback a GÉNEROS · RIDER · BASE.
- ✅ **T3** Sección **"Próximas fechas"** debajo del bloque de stats (tile ink con día/mes Anton + título y lugar). Solo visible si hay ≥1 futuro.
- ✅ **T4** Módulo **"Información de reserva"** destacado al inicio del aside: email + whatsapp como texto visible (estilo página de artista RA).
- ✅ **T5** Verificación con perfil de prueba (Pablo Rocha + 5 gigs inyectados); screenshot OK; data de prueba limpiada.
- Archivos: `src/lib/queries/gig-stats.ts` (nuevo) + `src/app/p/[slug]/page.tsx` (edits). Sin migración.
- Commit: `a1d2ff3`.

#### Unificación tech rider (cerrado 2026-05-28)
**Raíz del bug que reportó SANTIS:** había dos lugares para editar tech rider (textareas libres en `/perfil` + editor estructurado en `/configuracion`); el público priorizaba el estructurado y silenciaba el legacy.
- ✅ Sacar los 3 textareas legacy (`tech_rider_ideal`, `tech_rider_alt`, `hospitality`) del ProfileForm. Reemplazo por un card simple "Editar tech rider →" que lleva a `/configuracion#tech-rider`. Columnas se quedan en DB.
- ✅ Bloque **"Notas antiguas en tu perfil"** read-only en TechRiderSection si el DJ tiene texto legacy, para que migre al editor por categoría.
- ✅ Render público muestra las notas legacy como `NOTAS · IDEAL / ALTERNATIVO` (back-compat hasta que el DJ limpie).
- ✅ **Botón self-serve "Limpiar notas antiguas"** en TechRiderSection con confirmación. Action `clearLegacyTechRiderAction()` vacía los 3 campos. Cierra el ciclo de migración.
- Commits: `795521b` (unificación) + `483bda6` (botón limpiar).

#### Press kit PDF y deliverability
- ✅ **Bump del límite del PDF** del press kit: 10 MB → **25 MB** (más margen para press kits con imágenes/varias páginas). Migración `0025_press_kit_size_bump.sql`.

#### Admin · Comunicación con beta
- ✅ **Recordatorio beta personalizado** en `/admin/beta-reminder`. Tabla de destinatarios con días restantes (naranja ≤7, rojo ≤3) + envío secuencial con rate limit safety + detalle por destinatario. **Disparado 2026-05-28 a los 9 DJs activos, todos `delivered`.**
- ✅ **Instrumentación** de envíos en `usage_events` (`beta_reminder_sent`, `_failed`, `_batch_done`) con `resend_email_id` para correlación. Auditoría in-app además del dashboard de Resend.
- ✅ **Bug followup a SANTIS** — template reutilizable `bugFixFollowupEmail{Html,Text}` + action específica + botón en `/admin/beta-reminder` ("Avisar a SANTIS del fix de tech rider"). Le agradece el reporte y le pide probar 3 puntos.

#### Iconos del sidebar (cerrado 2026-05-28)
- ✅ Cada item del nav muestra un icono lucide (Set A · semántico) que entra **deslizándose desde la izquierda** en hover o cuando el item está activo. Decisión basada en mockup `drop_sidebar_icons_mockup.html`. Commit `c1f0646`.

#### Mobile rework (cerrado 2026-05-28)
- ✅ **BottomNav reemplazado por menú desplegable** (drawer slide-in desde la izquierda). Expone los 11 items del sidebar + admin si aplica + bloque de artista clickeable → `/perfil`. Mismo set de íconos lucide del desktop. Antes solo había 5 items y `Perfil` ni se podía alcanzar desde mobile.
- ✅ Botón hamburguesa en Topbar (mobile only) que se comunica con el drawer vía `CustomEvent` para no acoplar Topbar (client) ↔ MobileMenu (client) con store.
- ✅ Página `/mas` eliminada (redundante con el drawer). Redirect permanente `/mas` → `/dashboard` en `next.config.mjs`.
- ✅ ESC, click en backdrop, y cambio de ruta cierran el drawer. Scroll del body se bloquea mientras está abierto.
- Commit: `d321bce`.

#### Limpieza repo (cerrado 2026-05-28)
- ✅ Untrackeados `.docx`/`.pptx` de la raíz (artefactos regenerables por `scripts/build_estado_*.js`). Patterns agregados a `.gitignore` (`/*.docx`, `/*.pptx`, `drop_brandbook.pdf`, `drop_reels_output/`, `drop_ig_assets/`). Commit `e8a4191`.

#### Lecciones aprendidas (anotadas en memoria persistente)
- 🧠 Antes de `git push origin main` correr `npm run build` (no solo `tsc --noEmit`) — Vercel valida ESLint estricto y rompe builds que tsc no atrapa. Ver memoria `vercel_build_lesson_drop.md`.
- 🇨🇱 Tuteo chileno SIEMPRE en chat / emails / UI / commits. Nunca voseo argentino. Ver memoria `tono_drop.md`.

#### Sprint RA-3 · Seguir + notificaciones (cerrado 2026-05-28)
- ✅ **Fase 1** — schema + toggle. Migración `0026`: `notify_email` y `last_read_at` en `booker_favorites`. Toggle "Seguir con avisos" debajo del hero de `/p/[slug]` (componente `FollowNotifyToggle` + endpoint `/api/booker/favorite-state` extendido + action `toggleFollowNotifyAction`). Commit `f1ef4e5`.
- ✅ **Fase 2** — captura de events. Migración `0027`: tabla `dj_update_events` (`show_scheduled` + `availability_updated`) con trigger SQL `security definer` para auto-emit en cambios de `available_*` en `dj_profile`. Hook TS en `updateBookingSubmissionStatus` para emit en transición a `agendado`. Commit `d8993c3`.
- ✅ **Fase 3** — cron + email. Endpoint `/api/follow-updates/cron` (CRON_SECRET-protected): agrupa events por DJ, manda digest a followers con `notify_email=true`, loguea en `usage_events` (`follow_notif_sent`/`_failed`), marca `notified_at`. Template `followUpdatesEmail{Html,Text}`. GH Action diaria 13:00 UTC. Preview HTML en `drop_ra3_email_preview.html`. Commit `e6a1115`.
- ✅ **Fase 4** — feed. `/booker/favoritos` → `/booker/seguidos` con feed cronológico de updates (borde naranja en no leídas, badge "N nuevos"), `markFollowFeedRead()` al cargar, grilla de todos los DJs seguidos abajo. Redirect permanente del path viejo. Commit `e539b72`.
- 🎨 Mockups: `drop_ra3_seguir_notif_mockup.html` (UX) + `drop_ra3_email_preview.html` (email real renderizado).

**Siguiente sprint sugerido:** **RA-2 Parte A · DROP Picks** (3-4h, bajo riesgo).

**Parte B "Para ti"** queda diferida hasta que haya más bookers activos con favoritos (hoy 1-2 con datos suficientes).

**RA-4 · Panel multi-entidad** queda como último de la track porque es un cambio de arquitectura mayor (rompe el modelo `user_id ↔ dj_profile` 1:1).

---

## 12 · Sprint S19 · Suscripción MercadoPago (code-complete · verificación diferida)

Sistema de suscripción $10.000 CLP/mes vía MercadoPago, **paralelo al de beta** (los 9 DJs de beta legacy no se ven afectados). 4 fases entregadas:

| Fase | Estado | Commit |
|---|---|---|
| **F1** Schema + SDK MP | ✅ deployado | `ae95df6` |
| **F2** Trial 7d + paywall lockout | ✅ deployado y **visualmente verificado en localhost** (los 4 estados — trial 7d, trial 2d, vencido, active — se ven bien) | `80f5ea5` |
| **F3** Checkout MP + webhook | ✅ código deployado, **verificación end-to-end diferida** | `102d218` + `7ea302b` (fix REST API) |
| **F4** Gestión + cancelar | ✅ deployado | `8d85c34` |

**Por qué F3 está diferida**: probar el checkout MP en sandbox/localhost tiene fricciones que **desaparecen en prod**:
- Setup de "test users" específicos de MP (no aceptan cualquier email).
- CORS de MP API desde localhost a veces errático.
- Necesidad de **cloudflared** para que MP pueda alcanzar el webhook local.
- Cache de Chrome con chunks viejos durante development (vimos varios "Card token service not found" que eran cache + SDK glitches).

**Plan de reactivación cuando salga el sitio oficial**:
1. Cambiar `NEXT_PUBLIC_MP_PUBLIC_KEY` y `MP_ACCESS_TOKEN` de TEST a PROD en Vercel.
2. Configurar webhook URL en MP panel apuntando a `https://<dominio-real>/api/mp/webhook`.
3. Generar `MP_WEBHOOK_SECRET` en MP panel y guardarlo como env var.
4. Probar con tarjeta real (cobro de $10 CLP de prueba, refundable).
5. Activar el sistema para nuevos signups (sin tocar beta legacy users).

**Asuntos cubiertos por el código YA deployado**:
- ✅ Trial 7 días automático para signups nuevos.
- ✅ Banner Topbar (naranja → amarillo según días).
- ✅ Modal paywall bloqueante cuando trial vence.
- ✅ Form de checkout con MP (REST API direct + CVV protegido).
- ✅ Server action que crea preapproval (PAT recurrente).
- ✅ Webhook endpoint que sincroniza estado (preapproval + payment events).
- ✅ Página de gestión (`/configuracion/suscripcion`) con estado, historial, cancelar.
- ✅ Fallback PAT → manual cuando la tarjeta no soporta recurrencia.
- ✅ Política de cancelación (mantiene acceso hasta fin del período, sin reembolso, puede reactivar).

**Mockup compartido con Fer**: `~/Desktop/drop_journey_pago_suscripcion.html` (journey completo vertical scroll).

---

## 13 · Pre-lanzamiento final · Hardening de seguridad

Tareas que **deben ejecutarse antes de salir en vivo con la versión final** (cuando el público objetivo crezca de la beta cerrada actual a usuarios abiertos). Hoy (beta cerrada, ~12 DJs activos) el riesgo es bajo y diferimos para no introducir breakage rushed.

### 13.1 · Upgrade Next.js 14 → 15 (o 16)

**Por qué**: `npm audit --production` (2026-06-01) reporta **1 HIGH** + **2 MODERATE** CVEs en Next 14.2.35 (que ya es la última versión 14.x — no hay patch dentro de la rama 14):

| CVE | Descripción | Severidad |
|---|---|---|
| GHSA-9g9p-9gw9-jx7f | DoS via Image Optimizer remotePatterns | HIGH |
| GHSA-h25m-26qc-wcjf | HTTP request deserialization DoS (RSC inseguros) | HIGH |
| GHSA-ggv3-7p47-pfv8 | HTTP request smuggling en rewrites | HIGH |
| GHSA-3x4c-7xq6-9pq8 | Unbounded next/image disk cache growth | HIGH |
| GHSA-q4gf-8mx6-v5v3 | DoS con Server Components | HIGH |
| GHSA-8h8q-6873-q5fj | DoS con Server Components (otro vector) | HIGH |
| GHSA-3g8h-86w9-wvmq | Middleware / Proxy redirects cache-poisoned | HIGH |
| GHSA-ffhc-5mcf-pf4q | XSS en App Router con CSP nonces | HIGH |
| GHSA-vfv6-92ff-j949 | Cache poisoning via colisiones en RSC cache-busting | HIGH |
| GHSA-gx5p-jg67-6x7h | XSS en beforeInteractive scripts con input untrusted | HIGH |
| GHSA-h64f-5h5j-jqjh | DoS en Image Optimization API | HIGH |
| GHSA-c4j6-fc7j-m34r | SSRF en apps usando WebSocket upgrades | HIGH |
| GHSA-wfc6-r584-vfw7 | Cache poisoning en RSC responses | HIGH |
| GHSA-36qx-fr4f-26g5 | Middleware bypass en Pages Router con i18n | HIGH |

Riesgo real **bajo en beta cerrada con poco tráfico**, pero **medio-alto en producción pública** con escala creciente. La mayoría son DoS o cache poisoning que requieren tráfico/exposure pública para impactar.

**Por qué postergamos hoy**:
- Pasar 14 → 15 es **breaking change**. App Router cambió varias things entre majors (middleware, route handler params, async cookies/headers, etc.). Necesita testing dedicado.
- Hacer el upgrade en una sesión de seguridad rushed sin testing puede romper más de lo que arregla.

**Plan al ejecutar**:
1. Crear branch dedicada `chore/next-15-upgrade`.
2. `npm install next@15` (probar primero 15.x.X latest disponible al momento).
3. `npm run build` local → ir fixeando errores TS uno a uno.
4. Smoke test manual: login + dashboard + /dj + /p/[slug] + admin/feedback + /calendario + form de booking.
5. Re-correr `node scripts/screenshot_responsive.mjs` para verificar visual.
6. Re-correr `node scripts/audit_rls.mjs` (probable que las policies sigan iguales pero confirmar).
7. PR a `main`, deploy a preview, validar en `dropgigs-git-chore-next-15-upgrade-jay-manager-os.vercel.app`.
8. Una vez green, merge a main.

**Postcss (MODERATE)** se arregla solo al actualizar Next.

### 13.2 · uuid (transitivo de mercadopago)

**Issue**: el SDK `mercadopago@3.0.0` depende de `uuid` con CVE GHSA-w5hq-g745-h8pq (missing buffer bounds check en v3/v5/v6 cuando `buf` es proveído).

**Riesgo real**: bajo. Usamos el SDK MP para preapproval, payment y customer — esos endpoints internamente NO exponen un vector con `uuid.v3/v5/v6 + buf` controlado por el atacante.

**Acción al hacer 13.1**: ver si el SDK MP tiene versión nueva sin esa transitiva (revisar `npm view mercadopago@latest`). Si no, aceptar el riesgo y dejarlo documentado.

### 13.3 · DMARC `p=quarantine` → `p=reject` (cuando haya reputación)

Hoy DMARC está en `p=quarantine; pct=100; rua=mailto:hola@dropgigs.com` (commit pre-2026-06-01). Cuando dropgigs.com tenga ~6 meses de envíos limpios (todos con SPF+DKIM+DMARC PASS, sin reportes negativos en `rua`), considerar subir a:

```
v=DMARC1; p=reject; pct=100; rua=mailto:hola@dropgigs.com; ruf=mailto:hola@dropgigs.com
```

Esto le dice a Gmail/Outlook que **rechacen** (no cuarentinen) cualquier email spoofeado. Máximo nivel de protección anti-phishing del dominio.

### 13.4 · Rotar API keys con historial de compartido en chat

Durante el setup de Resend (2026-05-30) la API key `gmail-send-as-hola`
(`re_WnSV8qqT...`) se pegó en chat para destrabar el flow del Gmail
Send-as. El user decidió no rotar (riesgo concreto muy bajo: Anthropic
no expone transcripts y la key tiene scope sólo "Sending access"). Pero
best-practice anti-leak dice rotar después de cualquier shared.

**Plan al lanzar versión final**:
1. Crear nueva key en resend.com/api-keys (mismo scope: Sending access).
2. Update `RESEND_API_KEY` en Vercel env vars (Production + Preview).
3. Update local `.env.local`.
4. Redeploy Vercel para que tome la nueva.
5. Revoke la key vieja (`gmail-send-as-hola`).
6. Verificar con un test email que sigue funcionando.

### 13.5 · Otras tareas que pueden quedar abiertas durante el ciclo beta

A revisar antes del lanzamiento público:
- **Rate limiting** en endpoints públicos (`/api/feedback`, `/api/track`, `/api/unsubscribe`) — el barrido de seguridad #6 cubre esto.
- **Páginas `/privacy` y `/terms`** — necesarias para Google OAuth consent screen + GDPR-like en Chile (#7).
- **CSP headers** estrictos para defensa en profundidad.
- **Sentry o similar** para monitoring de errores en producción.
- **Backups verification** — Supabase hace snapshots automáticos en el plan paid; verificar que estén activos cuando se upgrade del plan free.
- **2FA disponible** para usuarios (Supabase soporta TOTP nativo).
- **Dependabot / Renovate** activo en GitHub para auto-update de deps con CVEs.

---

## 14 · Pestaña para DJs productores (Spotify / Beatport / plataformas) — propuesta 2026-06-03

**Origen:** feedback de usuario (DJ productor) — pide una sección dedicada a quienes producen, donde ver su música en Spotify (by artist), Beatport y demás plataformas, en vez de solo links sueltos.

**Estado hoy en el código:**
- `dj_profile` **NO distingue** DJ de productor (no hay `is_producer` ni `artist_type`). Solo `artist_name` + `genres[]`.
- De plataformas, el perfil solo guarda links de texto: `spotify_url`, `soundcloud_url`, `youtube_url`, `instagram_url`, `website`. **No existe** Beatport, Bandcamp, Apple Music, Mixcloud, Tidal.
- El press kit público (`/p/[slug]`) ya **embebe** SoundCloud y YouTube; Spotify es solo link clickeable.
- Ya hay precedente de "sync de plataformas": `platform-accounts-section.tsx` scrapea seguidores de SoundCloud/YouTube (HTML público) + la pestaña Growth guarda snapshots. Hay dónde colgar esto.
- `productor_musical` existe, pero solo como **tipo de contacto del CRM**, no como atributo del DJ logueado.

### Las 3 capas (de menor a mayor dificultad)

**Capa A — Tab "Productor" con embeds (recomendado partir por acá)**
- Flag `is_producer` (o `artist_type`) en `dj_profile` + campos URL/ID por plataforma.
- Sección en el editor de perfil + tab nuevo en el press kit público (`#productor` / `#releases`), visible solo si `is_producer`.
- Reproductores embebidos: Spotify (artist embed), Beatport (embed de track/chart), SoundCloud, Bandcamp.
- **Esfuerzo:** bajo (~1 sprint). **Trabas:** ninguna — sin API keys, sin OAuth.
- **Egress:** OK, los embeds cargan desde Spotify/Beatport, no desde Supabase (no revienta el free-tier — ver `supabase_egress_lesson_drop.md`).

**Capa B — Stats reales de Spotify**
- Spotify Web API (gratis, OAuth client-credentials — **sin** login del DJ) para traer seguidores, popularidad, top tracks y últimos lanzamientos. Refresco diario enganchado al cron que ya existe.
- **Esfuerzo:** medio. **Trabas:** los "oyentes mensuales" **NO** están en la API pública (solo en la web del artista → scraping frágil). Seguidores / top-tracks / releases sí están.
- ⚠️ **DECISIÓN CONSCIENTE:** "Spotify auto-sync" está hoy en la lista **"Descartado explícito"** (sección 1, línea ~120). Esta capa lo reabre. La Capa A **NO** es eso (es embed/link, sin sync). Si se hace la Capa B, hay que sacar Spotify de la lista de descartados a propósito.

**Capa C — Beatport / Apple Music (depende de terceros)**
- Beatport **no tiene API abierta** para developers (gated/partner). Solo embed o scraping → posiciones en charts y releases salen frágiles.
- Apple Music API existe pero exige membresía de Apple Developer (~US$99/año) + MusicKit/JWT.
- **Esfuerzo:** alto y con dependencia externa. Dejarlo como "según lo que permitan ellos", no comprometido.

### Qué implica concretamente
- **Schema:** migración con `is_producer boolean` + columnas `beatport_url`, `bandcamp_url`, `apple_music_url`, `mixcloud_url`, etc. (y `spotify_artist_id` si se hace Capa B).
- **UI:** sección en `/perfil` (editor) + tab condicional en `/p/[slug]` (público) + componentes de embed.
- **Sin riesgo de egress** mientras sean embeds/links.

### Recomendación
Partir por **Capa A** (vitrina con embeds) — barata, sin dependencias, valor inmediato para productores. Capa B (Spotify stats) como fase 2 *si* se decide reabrir el auto-sync. Capa C, oportunista.

---

## 15 · Descubrir · locales cerrados / renombrados / otro rubro — 2026-06-03

**Origen:** feedback de usuario — en "Descubrir" salen locales que ya cerraron, cambiaron de nombre o de rubro.

**Causa raíz:** "Descubrir" no tiene base propia; consulta **en vivo a OpenStreetMap** (Overpass API). OSM es comunitario y queda desactualizado.

**Lo ya hecho (commit `3f75962`, deployado):** se agregó `isVenueClosed()` que filtra locales que OSM marca como cerrados (prefijos `disused:`/`was:`/`abandoned:`, `disused=yes`, `opening_hours=closed`, `end_date`, nombres con "cerrado").

**⚠️ Hallazgo al probarlo contra datos reales (clave):** corriendo la consulta real de Santiago, el filtro nuevo cazó **0** locales cerrados (67 clubes / 348 bares), y una búsqueda directa de tags `disused:`/`was:`/`abandoned:` también dio **0**. Conclusión: **en Chile OSM prácticamente no registra los cierres** — cuando un local cierra, o nadie actualiza OSM (sigue tagueado como activo, sin señal) o lo borran. El filtro deployado es una red de seguridad correcta (sirve en ciudades mejor mapeadas o si alguien sí taguea), pero **NO resuelve la queja**: los locales muertos no traen ninguna marca que leer. Además el filtro corre solo al **importar** una búsqueda nueva (no re-limpia leads ya guardados).

### Las 2 soluciones reales

**Opción A — Crowdsource (gratis, recomendada para partir)**
- Cada DJ reporta "🚫 Cerró" sobre un local; cuando varios coinciden sobre el mismo `source_id` de OSM, desaparece para todos.
- **UX:** separar dos acciones en `lead-actions.tsx` → **Descartar** (X, solo tu lista, como hoy) vs **🚫 Cerró** (suma al contador compartido + te lo descarta). Badge "⚠️ N DJs reportaron que cerró" cuando otros lo ven.
- **Lógica:** umbral ~2 reportes (somos pocos DJs en beta, se ajusta). **Admin (Jaime/Fer) mata con 1 click** (cuenta como cierre inmediato). En búsquedas nuevas se filtran los `source_id` marcados → nunca reaparecen. En listas guardadas: badge + se esconde del filtro "Nuevos".
- **Construir:** 1 tabla `venue_closure_reports` (source, source_id, reported_by, created_at, `UNIQUE(source, source_id, reported_by)`) + tocar `lead-actions.tsx` y `discovered-leads.ts` + la action de guardar OSM.
- **Esfuerzo:** ~medio día. **Egress:** cero (tabla chica, sin imágenes).
- **Límites honestos:** arranca lento (el 1er DJ igual ve el muerto; mejora con el uso). Solo aplica a leads de OSM (los manuales son personales, ahí "Cerró" solo descarta para ese user).

**Opción B — Google Places (definitiva, pagada)**
- Cruzar cada local con `business_status: OPERATIONAL / CLOSED_TEMPORARILY / CLOSED_PERMANENTLY` — la verdad real de si sigue abierto.
- **Costo:** key de Google con billing (~US$17/1.000 consultas Place Details). Para acotar el gasto, correrlo **solo al promover** un lead al CRM, no en cada búsqueda.
- **Esfuerzo:** ~1-2 días.

### Recomendación
Partir por **Opción A** (crowdsource, gratis) — convive con el filtro ya deployado (uno saca lo que OSM marca, otro lo que la comunidad marca). Dejar **Opción B** (Google Places acotado a promoción) para cuando duela de verdad con volumen de usuarios.

---

*Documento vivo. Actualizar conforme se cierren sprints o se tomen decisiones.*
