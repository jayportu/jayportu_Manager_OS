# DROP — Auditoría integral 2026-07 · Fase 2: Flujos por rol

- **Fecha:** 2026-07-05 · **Entorno:** dev local `localhost:3010` (código de `main` @ `8dc3dd9`)
- **Método:** Playwright headless (Chromium), viewports desktop 1440×900 / tablet 768×1024 / mobile 375×812. Capturas en `docs/drop-audit/screenshots/before/`. **Cero acciones destructivas**: solo navegación, interacciones de UI y submits vacíos bloqueados por validación client-side. No se crearon cuentas ni registros.

## Restricción de entorno (importante)

El dev local apunta al proyecto Supabase remoto y **Supabase Auth tiene protección CAPTCHA activa a nivel de proyecto**. La site key de Turnstile solo permite los dominios de producción (error `110200: domain not allowed` con `localhost`). Consecuencias:

1. **Ningún flujo autenticado es probeable en local** (login siempre rechaza: `captcha protection: request disallowed`). Esto afecta también al desarrollo diario.
2. Roles DJ (cuenta demo `trial-test@dropdj.local`), booker y admin quedaron **auditados a nivel de código** en esta fase; su recorrido en runtime queda pendiente de que se whitelistee `localhost` en la config de Turnstile (Cloudflare) — cambio de 1 minuto, sin impacto en prod.
3. Roles **fotógrafo** y **audiovisual** no existen aún en el producto (aparecen como "PRÓXIMAMENTE" en el selector de la landing) — no hay nada que probar.

## 1. Visitante (no registrado) — probado en runtime ✅

| Flujo | Resultado |
|---|---|
| Landing `/` | ✅ 200. Renderiza completa (hero, features, showcase, directorio, roles, FAQ, CTA). Las secciones usan animación on-scroll. |
| Directorio `/dj` | ✅ 200. 17 DJs, búsqueda y filtros por género/ciudad funcionan. Búsqueda con `,()` no rompe (regresión QA-0611 verificada OK). Búsqueda sin resultados: estado vacío correcto. |
| Filtros `/dj/genero/*`, `/dj/ciudad/*` | ✅ Cargan. |
| Press kit `/p/nova-rios-demo` | ✅ 200 en 3 viewports, sin overflow horizontal en mobile. Gating de contacto a bookers OK. |
| Eventos `/eventos` | ✅ 200. Estado vacío bien resuelto ("Aún no hay eventos publicados" + CTA al directorio). |
| Login `/login` | ✅ 200. Anti-enumeración OK. Con credenciales inválidas muestra error y CTA de recuperación. |
| Signup DJ | ✅ Por diseño no existe `/signup` (beta cerrada, invitación vía `/beta`); nada enlaza ahí. `/signup/booker` carga OK. |
| Recuperación `/auth/forgot-password` | ✅ 200. Mensaje idéntico exista o no el email (anti-enumeración). |
| Formulario booking (press kit) | ✅ Submit vacío NO llega a `/api/booking` (validación client OK). No se envió ningún booking real. |
| Formulario `/beta` | ✅ Submit vacío NO llega a `/api/beta`. No se envió ninguna solicitud real. |
| Términos/Privacidad | ✅ 200. |
| Restricciones de acceso | ✅ `/admin`, `/crm`, `/dashboard`, `/bookers` → 307 a login sin sesión. Ruta inexistente → redirect (sin 404 crudo). |

## 2. DJ — bloqueado en runtime, auditado por código ⚠️

- Login con cuenta demo (`trial-test@dropdj.local`, ficticia, oculta del directorio) **imposible por el CAPTCHA** (ver restricción). Intentado en desktop y mobile; error reproducible.
- Cobertura por código (`src/app/(app)/*`): gating de layout (account_status → onboarding → beta), 13 secciones mapeadas (dashboard, calendario, crm, descubrir, lugares, perfil, press-kit, campañas, plantillas, gmail, growth, ia, configuración). Todas las queries filtran `user_id` (anti-IDOR, verificado en `src/lib/queries/*`).
- **Pendiente runtime:** onboarding wizard, carga de avatar/PDF, edición de perfil, tracklist editor, mensajería de campañas.

## 3. Booker — bloqueado en runtime, auditado por código ⚠️

- No existe cuenta booker de prueba; crear una escribiría en la BD de producción (bloqueado por reglas de esta auditoría) y además requiere el mismo CAPTCHA.
- Cobertura por código: `/booker/*` (requests, calendario, perfil, match, buscar, pitches, interesados, seguidos); RLS dual en `booking_form_submissions` con máquina de estados para contraofertas; vista tokenizada `/b/[token]` (requiere token válido — no disponible sin leer BD).

## 4. Admin — no probado en runtime (por diseño de la auditoría) ⚠️

- Requeriría credenciales admin reales. Cobertura por código: doble gate (`/admin/layout.tsx` + `assertAdmin()`), triggers DB anti-escalación (0053–0055, 0063). La Fase 8 incluirá tests de que un no-admin es rechazado.

## 5. Hallazgos de la fase

| ID | Hallazgo | Severidad | Evidencia |
|---|---|---|---|
| F2-1 | **Dev local no puede autenticar** (CAPTCHA Supabase + site key restringida a prod). Bloquea QA local de todo flujo logueado. | Alta (DX/QA) | `login_probe`: error 110200; captura `desktop--login-error.png` |
| F2-2 | **Iniciales fallback de avatar rotas con sufijo de país**: "APRA (UY)" → "A(", "GABO (CL)" → "G(", "LORENZ (CL)" → "L(". Visible en landing y directorio. | Media (visual, primera impresión) | `desktop--dj-directorio.png` |
| F2-3 | **Embed SoundCloud sin fallback**: URL inexistente → caja vacía grande en el press kit (widget 404). Afecta percepción profesional del press kit. | Media | `desktop--presskit-demo.png`; red: 404 `w.soundcloud.com/player` |
| F2-4 | Error de captcha mostrado crudo al usuario: "captcha protection: request disallowed (no captcha_token found)" — inglés técnico; `translateSupabaseError` no lo cubre. | Baja | `desktop--login-error.png`; `src/lib/auth-errors.ts` |
| F2-5 | CSP bloquea `va.vercel-scripts.com` (script debug de Vercel Analytics) → ruido de consola en dev. En prod Analytics usa `/_vercel/insights` (self) y no se ve afectado. | Baja (DX) | consola en todas las páginas |
| F2-6 | Métrica "SHOWS" del press kit muestra "–" cuando es 0, dentro de la franja destacada de stats (lectura ambigua: ¿error o cero?). | Baja | `desktop--presskit-demo.png` |
| F2-7 | Input de fecha del form de booking renderiza `mm/dd/yyyy` (formato US) según locale del navegador; audiencia es LATAM (dd-mm). | Baja | `desktop--presskit-demo.png` |
| F2-8 | 11 de 17 DJs del directorio no tienen foto → domina el fallback tipográfico. No es bug (contenido de usuarios), pero condiciona la primera impresión del directorio. | Info | `desktop--dj-directorio.png` |

## 6. Capturas

34 capturas en `docs/drop-audit/screenshots/before/` (`desktop--*`, `tablet--*`, `mobile--*`). Incluyen: landing (con y sin scroll — la versión `desktop--home.png` evidencia el artefacto de animaciones on-scroll en captura full-page), directorio + búsqueda + filtros, press kit completo (3 alturas en mobile), eventos, login/error, beta, signup booker, forgot password, legales, validaciones de formularios.

## 7. Qué falta para cerrar la Fase 2 al 100%

1. Whitelistear `localhost` (y opcionalmente `127.0.0.1`) en la site key de Turnstile → repetir el recorrido DJ con la cuenta demo (script listo y reutilizable).
2. Decidir cómo probar booker: (a) cuenta demo booker sembrada por el mismo mecanismo que `seed_demo_account.mjs` (requiere autorización explícita porque escribe en BD de prod), o (b) staging.
3. Credenciales/entorno para revisar `/admin` en runtime (o autorización para tests e2e con mocks).
