# DROP — Auditoría integral 2026-07 · Fase 5: Seguridad y privacidad (defensiva)

- **Fecha:** 2026-07-05 · **Alcance:** solo lectura de código y entorno local. Sin pruebas destructivas, sin tocar producción ni terceros. Valores sensibles enmascarados.
- **Contexto:** el proyecto ya pasó un hardening formal (migraciones 0053–0056, 0063; auditoría 2026-06-18; PRs #126–#146). Esta fase re-verifica y añade hallazgos nuevos.

## Resumen ejecutivo

**0 hallazgos críticos, 0 altos.** La postura defensiva es sólida: RLS en 38/38 tablas, triggers anti-escalación de privilegios, service_role aislado con `server-only`, webhooks con firma verificada en tiempo constante, CSP enforced, anti-enumeración en auth, 0 secretos hardcodeados. Los hallazgos son 1 medio y 7 bajos + 2 riesgos de proceso (fuera del código).

## Verificaciones que pasaron ✅

| Área | Resultado |
|---|---|
| Secretos en git | Solo `.env.example` (plantilla) trackeado; `.env*.local` ignorado; 0 credenciales en código/scripts (grep patrones `sk_`, `pk_`, `ghp_`…) |
| Secretos en cliente | Solo `NEXT_PUBLIC_*` legítimas (URL Supabase, anon key, MP public key, VAPID pública, Turnstile site key, Sentry DSN) — todas públicas por diseño |
| service_role | `src/lib/supabase/admin.ts` con `import "server-only"` + guard; usos justificados (webhooks, endpoints anónimos, admin) |
| RLS | 38/38 tablas; sin `USING (true)` en datos sensibles; `gmail_connections` sin políticas (deny-all para clientes, tokens cifrados AES-256-GCM) |
| Escalación vertical | Triggers BEFORE UPDATE bloquean `is_admin`, `beta_status`, `verified_at`, `is_drop_pick`, `account_status` para no-service_role (migraciones 0053–0055, 0063) |
| Acceso horizontal (IDOR) | Queries privadas filtran `.eq("user_id", user.id)` además de RLS (`src/lib/queries/*`); `/api/dj/contact` con autorización granular owner/booker |
| Webhooks | Resend (Svix) y MercadoPago: HMAC-SHA256 + `crypto.timingSafeEqual` + ventana anti-replay ±5 min; fail-closed sin secret |
| Crons | Bearer `CRON_SECRET` con comparación timing-safe (`src/lib/cron-auth.ts`) |
| XSS | `dangerouslySetInnerHTML` solo para JSON-LD con escape `<`; sin render de input de usuario sin sanitizar |
| SQLi | Todo vía PostgREST parametrizado; búsqueda `.or()` neutraliza `,()` (`src/lib/queries/contacts.ts:107`) |
| Open redirect | Redirects hardcodeados o `new URL(..., request.url)`; caso `next` en `/auth/callback` neutralizado por origin (diferido consciente en QA-0611) |
| Enumeración | Login y reset con mensajes idénticos exista o no la cuenta (verificado en runtime, Fase 2) |
| Headers | HSTS 1 año, X-Frame-Options SAMEORIGIN, nosniff, Referrer-Policy, Permissions-Policy, CSP enforced (`next.config.mjs:48-91`) |
| Anti-bot | Honeypot + Turnstile + rate limit 3/15min + dedup 30 días en `/api/beta`; CAPTCHA a nivel de Supabase Auth |
| CSRF | State cookie en OAuth Gmail; forms usan server actions (POST same-origin, `form-action 'self'`) |
| Borrado/exportación de datos | `/api/export` (solo datos propios, `no-store`); baja de emails con token HMAC |

## Hallazgos

### S-1 · MEDIO — Webhook MercadoPago: reintentos sin tope ante error persistente
- **Evidencia:** `src/app/api/mp/webhook/route.ts:101-108` — el handler devuelve 500 ante cualquier excepción, incluidas las no transitorias; MP reintenta indefinidamente.
- **Impacto:** ante un bug en `handlePayment`/`handlePreapproval`, bucle de reintentos (ruido, consumo, posible enmascaramiento del error real). No expone datos.
- **Condiciones:** requiere un pago real con webhook activo (Fase 4 de producto en pausa) + bug persistente.
- **Corrección:** distinguir errores no-recuperables (retornar 200 + log a Sentry con el payload id) de transitorios (500). Opcional: contador de reintentos por `mp_payment_id`.
- **Prueba de verificación:** test unitario del handler con payload que provoque error de validación → espera 200 + captura Sentry; error de red simulado → 500.

### S-2 · BAJO — Fallback de `UNSUBSCRIBE_SECRET` al service role key
- **Evidencia:** `src/lib/email/unsubscribe-token.ts:95` — si falta `UNSUBSCRIBE_SECRET`, firma HMAC con `SUPABASE_SERVICE_ROLE_KEY`.
- **Impacto:** acopla un secreto de máximo privilegio a un uso de bajo privilegio; complica rotación (rotar service key invalida links de baja).
- **Corrección:** exigir `UNSUBSCRIBE_SECRET` (fail-closed) o derivar con HKDF etiquetado. Verificar que la var ya está en Vercel (está en `.env.local`).
- **Prueba:** unit test: sin `UNSUBSCRIBE_SECRET` el módulo lanza error explícito.

### S-3 · BAJO — `/api/correo/attachment/[rid]/[aid]` sin validación de formato
- **Evidencia:** route handler interpola `rid`/`aid` en `https://api.resend.com/emails/receiving/{rid}/attachments/{aid}` sin validar patrón.
- **Impacto:** limitado (host fijo, requiere admin autenticado); permite requests malformadas a la API de Resend (path traversal teórico dentro del host).
- **Corrección:** validar `rid`/`aid` contra regex de ID de Resend/UUID antes del fetch; 400 si no matchea.
- **Prueba:** test del handler con `rid=../../x` → 400 sin fetch.

### S-4 · BAJO — Rate limiting in-memory
- **Evidencia:** `src/lib/rate-limit.ts` — Map en memoria; se resetea por cold start y no se comparte entre instancias serverless.
- **Impacto:** un atacante distribuido supera el límite nominal. Mitigado por Cloudflare delante; ya documentado como deuda consciente (roadmap: WAF pendiente).
- **Corrección:** mantener; completar el ítem del checklist "M1 rate-limit WAF Cloudflare" (config, no código).
- **Prueba:** N/A en código; verificar regla WAF en Cloudflare al activarla.

### S-5 · BAJO — `ignoreErrors` de Sentry por substring
- **Evidencia:** `src/instrumentation-client.ts:22-26`.
- **Impacto:** posibles falsos negativos de monitoreo (no es exposición).
- **Corrección:** convertir a regex ancladas.
- **Prueba:** revisar que un error sintético no-matcheado llega a Sentry en dev.

### S-6 · BAJO — Errores captcha de Supabase mostrados en crudo
- **Evidencia:** runtime Fase 2 (`desktop--login-error.png`); `src/lib/auth-errors.ts` no mapea `captcha protection: request disallowed`.
- **Impacto:** UX/percepción, y revela el mecanismo anti-bot (menor).
- **Corrección:** añadir mapeo es-CL: "No pudimos verificar que eres humano. Recarga la página e intenta de nuevo."
- **Prueba:** unit test de `translateSupabaseError` con los mensajes captcha conocidos.

### S-7 · BAJO — Cifrado de tokens Gmail depende de `GMAIL_TOKEN_ENC_KEY` presente
- **Evidencia:** `.env.example` la incluye; `.env.local` local no la tiene. El acceso ya es server-only (deny-all RLS), así que el cifrado es defensa en profundidad.
- **Impacto:** si en Vercel no está seteada, tokens quedarían en claro en la BD (solo legibles con service key).
- **Corrección:** confirmar en Vercel que está activa (no verificable desde el repo); si no, generarla y re-cifrar.
- **Prueba:** consulta admin puntual (autorizada por ti) verificando prefijo de cifrado en filas de `gmail_connections`.

### S-8 · BAJO — CSP sin `va.vercel-scripts.com` (solo afecta dev)
- **Evidencia:** consola en dev (Fase 2). En prod, Vercel Analytics usa `/_vercel/insights` (first-party, permitido por `'self'`).
- **Impacto:** ruido en dev; ninguno en prod (verificar tras el próximo deploy que el beacon carga).
- **Corrección:** opcional — condicionar la directiva en dev o ignorar.

## Riesgos de proceso (fuera del código, importantes)

### P-1 · ALTO — Datos personales reales sin proteger en el working tree
- **Evidencia:** `DROP_contactos_beta_cruce.xlsx`, `Base de Datos CS.xlsx`, `Base de datos CS 2.xlsx`, `scripts/*.csv` (logs de envíos con emails reales) — untracked pero NO ignorados; `.gitignore` solo cubre `.env*.local` y artefactos puntuales.
- **Impacto:** un `git add -A` (humano o herramienta) publicaría PII de usuarios beta en GitHub.
- **Corrección propuesta (Fase 7):** ampliar `.gitignore` con `*.xlsx`, `scripts/*.csv`, `scripts/envios*`, imágenes de trabajo — sin mover ni borrar ningún archivo.
- **Prueba:** `git status --short` no lista los archivos tras el cambio; `git check-ignore -v` los reporta.

### P-2 · MEDIO — Dev local opera contra la BD de producción
- **Evidencia:** `.env.local` → proyecto Supabase `https://exry***.supabase.co` (mismo de prod); no hay stack local ni proyecto staging.
- **Impacto:** cualquier script/prueba local puede tocar datos reales (esta auditoría lo evitó, pero el riesgo es estructural). Además el CAPTCHA impide login local (F2-1) → QA autenticada imposible.
- **Corrección propuesta:** (a) corto plazo: whitelistear `localhost` en Turnstile para QA con cuentas demo; (b) mediano: proyecto Supabase de staging o Supabase CLI local con las 66 migraciones (ya versionadas). Decisión tuya; no se implementa sin autorización.

## Cumplimiento de privacidad (nota)
- Datos personales mínimos y pertinentes; exportación de datos propia (`/api/export`); baja de comunicaciones operativa; Sentry sin PII (`sendDefaultPii: false`); analytics sin correlacionar sesión anónima con usuarios.
- Pendiente estructural (ya en roadmap, no bloqueante): flujo de **eliminación de cuenta** self-service; hoy no se encontró UI para borrar cuenta (solo export). Recomendado antes de salir de beta.
