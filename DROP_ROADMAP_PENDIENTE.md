# DROP. — Roadmap + estado del proyecto

> ⭐ **ESTE ES EL DOCUMENTO FUENTE DE VERDAD.**
> Si abres el proyecto y no sabes dónde estás o qué sigue, empieza acá.
> El `README.md` solo describe qué es DROP. y cómo levantarlo. Todo lo de
> "dónde voy / qué falta / qué decidí" vive en este archivo.

---

## 🎯 CÓMO RETOMAR — Resumen de sesión 2026-05-29

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

### Idea 3 · Pagos integrados Flow + MercadoPago → S19
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

### 13.4 · Otras tareas que pueden quedar abiertas durante el ciclo beta

A revisar antes del lanzamiento público:
- **Rate limiting** en endpoints públicos (`/api/feedback`, `/api/track`, `/api/unsubscribe`) — el barrido de seguridad #6 cubre esto.
- **Páginas `/privacy` y `/terms`** — necesarias para Google OAuth consent screen + GDPR-like en Chile (#7).
- **CSP headers** estrictos para defensa en profundidad.
- **Sentry o similar** para monitoring de errores en producción.
- **Backups verification** — Supabase hace snapshots automáticos en el plan paid; verificar que estén activos cuando se upgrade del plan free.
- **2FA disponible** para usuarios (Supabase soporta TOTP nativo).
- **Dependabot / Renovate** activo en GitHub para auto-update de deps con CVEs.

---

*Documento vivo. Actualizar conforme se cierren sprints o se tomen decisiones.*
