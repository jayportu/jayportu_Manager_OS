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
- [ ] 📋 Calendario público de disponibilidad en `/p/[slug]` (S20, idea 4)

### FASE 5 · Loops de crecimiento y retención · paralelo, con tracción
> Vamos **en orden**: RA-5 ✅ → RA-6 ✅ → RA-7 ✅. **Fase 5 (loops core) completa.**
- [x] 🆕 **RA-5 · Analytics del press kit.** ✅ 2026-06-08 (PR #39, en prod). Vista `/press-kit/stats`: rango 7/30/90, KPIs (visitas/clicks/solicitudes/conversión), embudo, visitas por día, por canal, "de dónde llegan" (referrer/país/UTM — data capturada nunca mostrada) y solicitudes por estado. Barras CSS, sin librería, **$0**. Migración 0047 (RPCs agregadas) **destapó el cap de 1000** → cierra el QA finding de press-kit ↓.
- [x] 🆕 **RA-6 · Aviso de fecha a seguidores.** ✅ 2026-06-08 (PR pendiente, en prod). El loop de email ya existía (RA-3: `dj_update_events` + trigger + cron diario que emaila a seguidores con `notify_email=true`). Este sprint lo **destrabó**: arregló 2 bugs pre-existentes que lo dejaban muerto — (1) `booker_favorites` no tenía policy de UPDATE → activar/desactivar avisos era un no-op silencioso (migración 0048); (2) la grilla de favoritos en `/booker/seguidos` salía siempre vacía (join a `dj_profile` bajo RLS owner-only → ahora resuelve vía admin client). Polish: toggle 🔔 clickeable en `/booker/seguidos` + feedback al DJ en disponibilidad. **"Instantáneo" (digest diario es suficiente, menos spam) y "push" (infra pesada) diferidos** — sin combustible aún (0 seguidores). Verificado en vivo: toggle persiste true↔false.
- [x] 🆕 **RA-7 · Página de evento + RSVP.** ✅ 2026-06-08 (en prod). El DJ publica un show del calendario como página pública `/e/[token]` (botón "Evento" en /calendario → `/calendario/[id]/evento`); los fans (sin cuenta) hacen RSVP por email (voy/quizás + "avísame"). El DJ ve la lista de asistentes = **leads** + export CSV. Los fans que tildan "avísame" reciben email cuando el DJ publica un próximo evento (síncrono + rate-limited; cap 100 → mover a cron si crece). Migración 0049 (`calendar_events.is_public/public_token/ticket_url` + tabla `event_rsvps` con policy SELECT al dueño). Verificado en vivo: publicar → página pública → RSVP persiste + contador + el DJ ve el lead. *(El envío de email a fans solo corre en prod: `RESEND_FROM_EMAIL` no está en el .env local.)* **Endurecido post-QA (2026-06-10, PR #62):** `escapeHtml` en el email a fans (anti-inyección), **baja real** vía link de unsubscribe por RSVP, cap síncrono 50 + `maxDuration=60`, solo `type='show'` publicable, "N van" cuenta solo "voy", upsert robusto (carrera), CSV con BOM + anti-fórmula. **2 decisiones tomadas:** (a) **M10 — double opt-in del fan DIFERIDO a escala** (mitigado: el aviso solo sale al publicar y ahora trae baja real → daño acotado; el double opt-in metería fricción justo en el loop fan→lead); (b) **republicar mantiene el token a propósito** (evita re-spamear y conserva el link compartido — no es bug).
- [ ] 📋 S22 Ads tracker · S24 música personal · tab Productor (sección 14) · Descubrir locales cerrados (sección 15)
- [ ] 🆕 LinkedIn / contenido para bookers — *track de marketing, no código*

### FASE 6 · Hardening pre-lanzamiento público · gate antes de abrir
**Objetivo:** abrir a bookers = más exposición → blindar antes.

- [x] ⚪ **Quick wins de hardening.** ✅ 2026-06-08 (en prod). Rate-limit agregado a los endpoints públicos que faltaban (`/api/booking`, `/api/feedback`, `/api/nps`, `/api/overpass`); **security headers** en `next.config.mjs` (HSTS, X-Frame-Options SAMEORIGIN, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy) + **CSP en Report-Only** (no bloquea — base para endurecer); **Dependabot** (`.github/dependabot.yml`, dejado en **solo-seguridad** desde #58 — la activación inicial generó ráfaga de PRs/emails de updates rutinarios; ahora solo abre PR ante una vulnerabilidad). Verificado en vivo: headers presentes + `/api/booking` da 429 tras 10/min.
- [x] 🔴 **Next.js 14 → 15** ✅ 2026-06-08 (en prod). Subido a **next@15.5.19** manteniendo **React 18** (los CVEs eran de Next, no de React → mínimo riesgo). **14 CVEs HIGH eliminados** (quedan 2 moderate transitivos: postcss bundleado en Next + uuid de MercadoPago, ya aceptado en 13.2). Suave porque el código ya era async-ready (`cookies()` await + `params`/`searchParams` Promise). Fixes: `<a href="/gmail">`→`<Link>` (lint estricto), `outputFileTracingRoot` (lockfile perdido en ~/), tsconfig target→ES2017 (auto). Smoke test en vivo: /dj, login→dashboard, /calendario, /p/[slug] ✓.
- [ ] 🟡 **CAPTCHA Turnstile** en los 4 forms de auth (heredado de Fase 2) — código mío + keys de Cloudflare (tú).
- [ ] 🟡 **Sentry** monitoring — SDK mío + proyecto/DSN (tú).
- [ ] 📋 **CSP enforce** (hoy report-only) · 2FA (Supabase TOTP) — pases dedicados.
- [ ] 🟡 **M10 · Double opt-in del fan (RA-7)** — hoy un fan puede inscribir el email de un tercero a los avisos de un DJ. **Diferido a escala** (mitigado: el aviso solo sale al publicar un nuevo show + baja real en cada correo). Revisitar si crece el volumen o aparecen quejas de spam: mandar correo de confirmación antes de activar `notify_future`.
- [ ] 🔵 **Ops tuyas (al lanzar):** DMARC `p=reject` (con reputación), rotar API key Resend, confirmar que los **backups automáticos de Supabase** estén activos (ya estamos en **plan Pro** desde 2026-06-04 → los snapshots vienen incluidos, solo verificar). *(`/privacy` + `/terms` ya existen.)*
- [x] ⚪ **QA tab por tab (2026-06-07/08)** — barrido exhaustivo de bugs/fricciones por pestaña (workflow multi-agente, 77 hallazgos). **73/77 arreglados y en prod** (PRs #17–#31): 11 altos + 30 medios + 32 bajos. Bonus de la tanda: dashboard de email en tiempo real (webhook `campaign_id`, PR #13) y Gmail N+1 → batch endpoint (PR #31). **Quedan 3 a propósito:** 2 de cobros (reactivar suscripción + acceso en `pending`) → entran con Fase 4 · pagos; IA race condition (moot — la IA salió del nav). *(El press-kit tope-1000 quedó resuelto por RA-5 / migración 0047.)* Detalle completo en `QA_FINDINGS.md`.
- [x] ⚪ **Test de funcionalidad de lo nuevo (2026-06-10)** — Smart Match, RA-5/6/7 y hardening/Next 15 (3 revisores + pruebas en vivo, ~34 hallazgos). **32 arreglados y en prod**, en 5 PRs por área: **#61** Smart Match (score inflado, chips que se borraban al buscar, parser por límites de palabra, embudo tope 100%, crash de params duplicados); **#62** RA-7 (ver detalle ↑: escapeHtml, baja real, cap+maxDuration, solo-show, "N van", upsert, CSV); **#63** RA-5 analytics (suma de barras = KPI, día Chile sin DST, embudo sin desborde); **#64** RA-6 (toggle 🔔 sincronizado entre instancias); **#65** hardening + bajos (IP real `cf-connecting-ip` tras Cloudflare, nudge foto, `<button>` fuera del `<Link>`, CSP + countriesnow.space, código muerto). Prod verificado sano (deploy success + CSP nueva en vivo). **2 quedan a propósito:** M10 (double opt-in del fan, diferido a escala — ver hardening ↓) y republicar-mantiene-token (por diseño).

### Backlog / deuda menor (no bloquea)
- [ ] 🆕 **Smart Match v2 parte 2** (solo si el heurístico se queda corto): semántica con embeddings + pgvector, búsquedas/alertas guardadas, filtro por fecha exacta de calendario. Embeddings = costo recurrente + dependencia externa → por eso quedó fuera del v2 actual.
- [ ] ⚪ Paginación CRM a escala · acciones masivas · duplicar plantilla · validación formato (email/WhatsApp) · botón PNG tracklist (BUG-02) · dedup/idempotencia en crons · drill-down posts→campaña en Growth
- [ ] 📋 RA-4 Panel multi-entidad (último — cambio de arquitectura mayor)

**Siguiente paso (a elección):** **Fase 6 ya tiene hechos sus 2 grandes** (quick wins ✅ + Next 15 ✅, 2026-06-08) + el **test de funcionalidad de lo nuevo cerrado** (2026-06-10, 32/34 en prod, PRs #61–#65). Quedan, cuando quieras: CAPTCHA Turnstile + Sentry (necesitan cuentas tuyas: Cloudflare / Sentry), CSP-enforce / 2FA (pases dedicados) y **M10 double opt-in del fan** (diferido a escala). **Fase 4 · suscripción** sigue en stand-by hasta fin de beta. Fases 0-3 + **Fase 5 loops core (RA-5/6/7)** en prod. Backlog: v2 parte 2 (embeddings), sueltos de Fase 5 (S22/música/Productor), RA-4.

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
- [ ] **Sitemap.xml + robots.ts** — indexación del directorio en Google (~30 min, también es falencia #05)

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
- [ ] MercadoPago (LATAM completo, más alcance)
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
