# DROP. — Roadmap + estado del proyecto

> ⭐ **ESTE ES EL DOCUMENTO FUENTE DE VERDAD.**
> Si abres el proyecto y no sabes dónde estás o qué sigue, empieza acá.
> El `README.md` solo describe qué es DROP. y cómo levantarlo. Todo lo de
> "dónde voy / qué falta / qué decidí" vive en este archivo.
>
> Última actualización: 2026-05-26
> Estado git: Bloques B + C mergeados a `main` y deployados. Rama `feat/C-booking-state` borrada (ya integrada).

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
| 04 | `presskit_events.event` tiene 11 valores hardcoded en CHECK | 🟢 Deuda técnica | Validar en server con whitelist en código, sin CHECK constraint |
| 05 | No hay `sitemap.xml` ni `robots.txt` explícito | 🟡 SEO | `app/sitemap.ts` + `app/robots.ts` (~30 min) |
| 06 | Disponibilidad existe en data, no en UI pública | 🟡 Feature incompleta | Idea 4 (S20) |
| 07 | 21 migraciones para una app personal — SQL adelantado al frontend | 🟢 Deuda técnica | Auditar columnas/tablas 0017-0020 sin UI consumidora. Cerrar UI o quitar SQL |

---

## 4 · Redundancias / cosas sin sentido (sección 05 del plan)

| # | Problema | Severidad | Fix |
|---|---|---|---|
| 01 | Dos rutas a campañas: `/campanas` y `/growth/campanas` | 🔴 UX confuso | Consolidar en `/campanas` con tabs "Outbound" / "Growth/Ads" |
| 02 | README vs NEXT_SESSION desincronizados sobre sprints | 🔴 Docs | Consolidar NEXT_SESSION como source-of-truth, eliminar sección "Roadmap actual" del README |
| 03 | 3 entry points públicos: `/login`, `/welcome`, `/beta` | 🟡 Flujo poco claro | Definir gate beta abierta/cerrada. Si abierta: eliminar `/beta`. Si cerrada: redirect `/login` → `/beta` |
| 04 | `created_contact_id` en bookings nunca se popula desde el form | 🟢 Deuda | Auto-poblar al pasar a `leido`/`cotizado`, remover del POST público |
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
| 04 | `created_contact_id` nunca se popula desde el form | ⏳ auto-poblar al pasar a leído/cotizado |
| 01 | Dos rutas a campañas: `/campanas` y `/growth/campanas` | ⏳ unificar en tabs cuando se toque Campañas (S22) |
| 03 | 3 entry points públicos: `/login`, `/welcome`, `/beta` | ⏳ requiere decidir gate beta abierta/cerrada primero |

### Convención sprint ↔ migración (fix #05)

No hay mapeo 1:1 entre "sprints" y números de migración. Son dos sistemas distintos:

- **Migraciones** (`supabase/migrations/NNNN_descripcion.sql`): orden secuencial de 4 dígitos, una por cambio de schema. Es el orden **autoritativo** del SQL. Hoy van de `0001` a `0022`.
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

*Documento vivo. Actualizar conforme se cierren sprints o se tomen decisiones.*
