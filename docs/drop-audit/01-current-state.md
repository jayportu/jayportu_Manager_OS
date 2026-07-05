# DROP — Auditoría integral 2026-07 · Fase 1: Estado actual

- **Fecha:** 2026-07-05
- **Rama de auditoría:** `audit/drop-integral-2026-07` (desde `main` @ `8dc3dd9`)
- **Base:** `main` sincronizado con `origin/main`. Working tree limpio en archivos trackeados.
- **Método:** revisión completa del repo (código, migraciones, docs, ramas en curso) + arranque local verificado.

---

## 1. Arquitectura y tecnologías

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend/SSR | Next.js 15 (App Router) + React 18 + TypeScript 5 | ~254 archivos en `src/app` |
| Estilos | Tailwind CSS 3.4 + shadcn/ui (Button, Input, Card, Select…) + tokens CSS custom | Sistema "brutalist type beat": dark `#0B0B0B` por defecto (PR #167), naranjo `#E85A0C`, Anton/Inter/Space Mono |
| Backend/BD | Supabase (Postgres + Auth + Storage) con RLS en **38/38 tablas** | 66 migraciones (`supabase/migrations/`) |
| Pagos | MercadoPago (suscripción DJ, preapproval) | Fase 4 code-complete, **en pausa hasta fin de beta** |
| Emails | Resend (transaccional + campañas + inbound `hola@dropgigs.com`) | Webhook con firma Svix verificada |
| Observabilidad | Sentry (server + client, `sendDefaultPii: false`) + Vercel Analytics | Dormido sin DSN |
| Push | web-push (VAPID) | `/api/push/*` |
| Hosting | Vercel (prod = dropgigs.com) + Cloudflare delante | Crons protegidos con `CRON_SECRET` |
| Dev local | `npm run dev` → **puerto 3010** | Verificado: HTTP 200. Lint: 2 warnings preexistentes. `tsc --noEmit`: 0 errores |

### Flujo de datos
- **Browser** → anon key + RLS (`src/lib/supabase/client.ts`).
- **SSR/Server Actions** → anon key + cookie de sesión (`src/lib/supabase/server.ts`); todas las queries privadas filtran `.eq("user_id", user.id)` además de RLS.
- **service_role** solo en server (`src/lib/supabase/admin.ts`, con `server-only`): endpoints públicos anónimos (booking, tracking), webhooks y panel admin.
- **Storage:** buckets públicos `press-kits` (PDF 10MB) y `avatars` (imágenes 5MB), escritura segregada por carpeta `{user_id}/`.

## 2. Roles y permisos reales

**Roles implementados: DJ, Booker, Admin.** Los roles "fotógrafo" y "profesional audiovisual" **no existen todavía** en el producto (solo hay un mockup exploratorio `drop_perfiles_creativos_mockup.html`). La auditoría por roles cubre lo que existe.

- **DJ** — `dj_profile` (1:1 con `auth.users`, creado por trigger). Estados: `account_status` (`active|suspended|banned`), `beta_status` (`none|active|expired|paying`), `verified_at`, `is_drop_pick`.
- **Booker** — `booker_accounts` + `user_metadata.account_type='booker'`. Tipos: venue, productora, agencia, evento privado, casamiento, corporativo, festival, otro.
- **Admin** — DJ con `is_admin=true`. Protegido contra auto-escalación por trigger (migración 0053).

**Gating en 3 capas:**
1. `src/middleware.ts` — whitelist de ~40 rutas públicas; sin sesión → `/login`.
2. `src/app/(app)/layout.tsx` — orden: account_status → onboarding → suscripción/beta.
3. Server actions/queries — `assertAdmin()` (`src/lib/queries/admin.ts`) y filtro `user_id` en cada query.

Además, triggers Postgres impiden que un usuario se auto-asigne `is_admin`, `beta_status`, `verified_at`, `is_drop_pick` o `account_status` (migraciones 0053–0055, 0063).

## 3. Mapa de navegación

### Público (visitante)
`/` (landing split DJ/Booker) · `/dj` (+ `/dj/ciudad/[city]`, `/dj/genero/[genre]`) · `/p/[slug]` (press kit) · `/eventos` · `/e/[token]` (evento tokenizado) · `/b/[token]` (vista booker tokenizada) · `/login` · `/signup` · `/signup/booker` · `/beta` · `/terms` · `/privacy` · `/auth/*` (callback, forgot/reset password) · `/cuenta-suspendida`

### DJ (grupo `(app)`, requiere sesión + onboarding completo)
`/dashboard` · `/calendario` (+ tracklist editor) · `/crm` · `/descubrir` (venue matching) · `/lugares` · `/perfil` · `/press-kit` · `/campanas` · `/plantillas` · `/gmail` · `/growth` · `/ia` · `/configuracion` · `/suscripcion`

### Booker (layout propio)
`/booker/requests` · `/booker/calendario` · `/booker/perfil` · `/booker/match` · `/booker/buscar` · `/booker/pitches` · `/booker/interesados` · `/booker/seguidos`

### Admin (`/admin/*`, doble gate)
Analytics · beta-requests · moderación de usuarios/bookers · verificación DJ · campañas email · feedback · onboarding-nudge

### API (resumen)
- Públicas: `/api/track`, `/api/site-track`, `/api/booking`, `/api/event-rsvp`, `/api/nps`, `/api/feedback`, `/api/beta`, `/api/unsubscribe` (token HMAC)
- Webhooks firmados: `/api/resend/webhook`, `/api/mp/webhook`
- Crons (Bearer `CRON_SECRET`, comparación timing-safe): beta/expire, gmail/sync, growth/sync, push/send, follow-updates, onboarding-nudge, pulso, dj-verify/sweep
- Privadas: `/api/dj/contact`, `/api/export`, `/api/gmail/*`, `/api/push/subscribe`, `/api/correo/attachment/*` (admin)

## 4. Modelo de datos (esencial)

38 tablas, todas con RLS. Núcleos:
- **Identidad:** `dj_profile`, `booker_accounts`
- **CRM:** `contacts`, `interactions`, `follow_ups`, `discovered_leads`, `campaigns`, `campaign_contacts`
- **Press kit / booking:** `presskit_events`, `booking_form_submissions` (RLS dual DJ/booker con máquina de estados), `tech_rider_items`, `tracklists`, `music_links`, `beatport_releases`, `featured_sets`, galería
- **Integraciones:** `gmail_connections` (**sin políticas RLS = server-only**, tokens cifrados AES-256-GCM), `gmail_threads_cache`, `calendar_events`, `platform_accounts`, `platform_snapshots`
- **Plataforma:** `beta_requests`, `subscriptions`, `subscription_payments`, `feedback_reports`, `nps_responses`, `usage_events`, `site_events`, `email_suppressions`, `push_subscriptions`, `activation_emails`, `dj_presence`, `dj_update_events`
- **Booker:** `booker_favorites`, `venue_interests`, `venue_pitches`

## 5. Dependencias críticas
- Supabase (auth+datos+storage) — único proveedor de estado. Backups: **verificación pendiente** (ítem abierto del checklist de lanzamiento del roadmap).
- Resend — transaccional + inbound; DMARC `p=reject` pendiente (roadmap).
- MercadoPago — inactivo hasta fin de beta (Fase 4 en pausa).
- Vercel + Cloudflare — hosting/WAF; rate-limit WAF pendiente (roadmap).
- Google OAuth — signup + Gmail (scopes separados).

## 6. Trabajo en curso — NO pisar
- **`feat/landing-dark`** (rama activa): limpieza grande — elimina product-showcase, vistas month/cobros del calendario, galería inline del perfil, docs de Fase 7. **Sin mergear; esta auditoría no toca esos archivos en direcciones contradictorias.**
- **`design/drop-dark-rebranding`**: ya integrada en `main` (PR #167, dark rebrand live). Sin commits divergentes.
- **`docs/redesign/` + `design-audit/`**: sistema visual ya decidido (tokens dark finales en `design-audit/TOKENS_DARK.md`, sistema "Afuera/Backstage" en `design-audit/DESIGN_SYSTEM.md`, accesibilidad AA verificada). La Fase 3 de esta auditoría **parte de esas decisiones**, no las reinventa.
- QA previo: `QA_FINDINGS.md` (77 hallazgos, 73 resueltos) y `QA_FINDINGS_0611.md` (100 hallazgos, ~90% resueltos). Los abiertos son diferidos a propósito y documentados.

## 7. Riesgos iniciales detectados

| # | Riesgo | Severidad | Evidencia |
|---|---|---|---|
| R1 | **Working tree con datos reales sin ignorar**: `DROP_contactos_beta_cruce.xlsx`, `Base de Datos CS*.xlsx`, CSVs de envíos en `scripts/` con emails reales. Un `git add -A` accidental los publicaría. | Alta (proceso) | `git status`; `.gitignore` no cubre `*.xlsx`/`*.csv` |
| R2 | **Dev local apunta a Supabase de producción** (no existe stack local ni staging). Cualquier script o prueba local escribe en prod. | Alta (proceso) | `.env.local` → `https://exry***.supabase.co`; sin Docker/CLI supabase |
| R3 | Webhook MercadoPago devuelve 500 en cualquier error → reintentos indefinidos de MP ante bug persistente | Media | `src/app/api/mp/webhook/route.ts:101-108` |
| R4 | Fallback de `UNSUBSCRIBE_SECRET` a `SUPABASE_SERVICE_ROLE_KEY` como clave HMAC | Baja | `src/lib/email/unsubscribe-token.ts:95` |
| R5 | `/api/correo/attachment/[rid]/[aid]` interpola params en URL de fetch sin validar formato UUID | Baja | route handler correspondiente |
| R6 | Rate limiting in-memory (se reinicia por cold start serverless); WAF pendiente | Baja (mitigado por Cloudflare) | `src/lib/rate-limit.ts` |
| R7 | `ignoreErrors` de Sentry por substring puede silenciar errores reales | Baja | `src/instrumentation-client.ts:22-26` |
| R8 | Open-redirect parcial en `/auth/callback` (param `next` no sanitizado, neutralizado por origin) — ya documentado en QA 0611 como diferido | Baja | QA_FINDINGS_0611 |
| R9 | Sin pruebas automatizadas: no hay tests unitarios ni e2e en el repo (playwright instalado pero sin suite) | Media | ausencia de `tests/`, `*.spec.*` |
| R10 | Componentes muy grandes concentran lógica+presentación: `p/[slug]/page.tsx` (893 líneas), `tracklist-editor` (823), `profile-form.tsx` (774), `templates.ts` de email (2597) | Media (mantenibilidad) | conteo de líneas |

## 8. Problemas técnicos detectados (línea base)
- Lint: 2 warnings (`favorite-button-client.tsx:93` exhaustive-deps; `product-showcase.tsx:16` var sin uso — este archivo lo elimina `feat/landing-dark`, no tocar).
- `next lint` deprecado (aviso de Next 16) — migración a ESLint CLI recomendada a futuro.
- Type-check limpio.
- Sin documentación de arquitectura/RLS/API consolidada (los docs de negocio sí son fuertes) — hueco señalado también por la exploración de docs.

## 9. Fortalezas (para no romper)
- RLS al 100% con triggers anti-escalación; separación estricta anon/service_role con `server-only`.
- Webhooks con verificación de firma y comparación timing-safe; CSP enforced; headers de seguridad completos.
- Anti-enumeración en login/reset; honeypot + Turnstile + rate limit en `/api/beta`.
- 0 secretos hardcodeados; `.env.local` fuera de git.

## 10. Áreas no comprobadas en Fase 1
- Panel admin en runtime (requiere credenciales admin reales — no se usarán sin autorización).
- Flujos de pago MercadoPago end-to-end (Fase 4 en pausa; no se probará contra MP live).
- Envío real de emails (no se dispararán envíos desde la auditoría).
- Crons en Vercel (solo revisión de código).
- Backups de Supabase (acceso a dashboard requerido; ya es ítem abierto del roadmap).
