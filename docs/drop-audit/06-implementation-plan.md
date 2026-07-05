# DROP — Auditoría integral 2026-07 · Fase 6: Plan maestro de implementación

- **Fecha:** 2026-07-05 · **Rama:** `audit/drop-integral-2026-07` · **Regla:** un commit por etapa, reversible con `git revert <sha>`; lint + type-check + smoke antes de cada commit; **nunca** `git add -A`.
- **Priorización aplicada:** 1) críticos → 2) seguridad/permisos → 3) flujos → 4) inconsistencias → 5) sistema de diseño → 6) visual → 7) optimización.

## Restricciones que acotan el alcance implementable ahora
1. **Sin runtime autenticado** (CAPTCHA — F2-1): no se refactoriza nada cuyo comportamiento solo sea verificable logueado.
2. **`feat/landing-dark` en curso**: no se tocan archivos que esa rama elimina/reescribe (`product-showcase.tsx`, `cobros-view.tsx`, `finance-edit.tsx`, `month-view`, galería inline de perfil, admin bookers).
3. **Sin migraciones de BD**: ninguna etapa requiere tocar el esquema (todas son de app). Las correcciones que exigirían staging (S-1 completo, S-2) quedan documentadas, no implementadas.
4. **Sin dependencias nuevas**: unit tests con `node:test` nativo; e2e con el Playwright ya instalado.
5. **T-3 (refactor de componentes gigantes) diferido**: riesgo medio-alto sin suite de tests consolidada y sin runtime autenticado. Queda como recomendación para el siguiente ciclo.

## Etapas

### Etapa A — Protección de datos en el repo (P-1) · prioridad 1
- **Objetivo:** que ningún archivo con PII pueda entrar a git por accidente.
- **Archivos:** `.gitignore`.
- **Cambio:** ignorar `*.xlsx`, `*.csv` de raíz y `scripts/`, imágenes de trabajo de raíz, `.agents/`, `.playwright-mcp/`. Sin mover/borrar nada.
- **Riesgos:** ninguno (no afecta archivos ya trackeados; verificar con `git ls-files` que no des-trackea nada).
- **Aceptación:** `git status` deja de listar los archivos con datos reales; `git check-ignore -v "Base de Datos CS.xlsx"` responde.
- **Rollback:** revert del commit.

### Etapa B — Endurecimiento puntual de código (S-3, S-6, T-4) · prioridad 2
- **Objetivo:** cerrar los hallazgos de seguridad/robustez de esfuerzo S sin cambio de comportamiento para usuarios legítimos.
- **Archivos:** `src/app/api/correo/attachment/[rid]/[aid]/route.ts` (validación de formato de IDs), `src/lib/auth-errors.ts` (mapeo captcha/rate-limit es-CL), `src/lib/tz.ts` + `src/lib/queries/growth.ts` (guards en vez de `!`).
- **Riesgos:** regex demasiado estricta en attachment (mitigación: validar contra formato real de IDs de Resend, permisivo en longitud); traducción no debe ocultar el error real (se conserva mensaje original en consola/Sentry).
- **Aceptación:** unit tests de `auth-errors` y `tz` en verde; type-check limpio.
- **Rollback:** revert.

### Etapa C — Observabilidad de errores (T-2 parcial, T-8 parcial) · prioridad 2–3
- **Objetivo:** que los fallos de server actions lleguen a Sentry con contexto y sin PII.
- **Archivos:** nuevo `src/lib/observability.ts` (`captureError`); adopción en actions de calendario, crm, perfil, press-kit (los `catch` existentes); `src/app/auth/callback/route.ts` (quitar email del log).
- **Riesgos:** cambiar semántica de un catch (mitigación: solo se añade captura, se conserva el retorno actual `{ ok:false, error }`).
- **Aceptación:** lint/tsc verdes; grep confirma que los catch de actions principales capturan; el log de callback ya no imprime email.
- **Rollback:** revert.

### Etapa D — Quick wins UX públicos (U-1, U-2, U-4, U-5, T-10 parcial, F2-5) · prioridades 4–6
- **Objetivo:** corregir los defectos visibles de primera impresión sin tocar el sistema visual.
- **Cambios:**
  1. **U-1**: helper puro `getInitials()` (ignora paréntesis/emojis/símbolos) + uso en los fallbacks de avatar (directorio, landing, press kit).
  2. **U-2**: fallback de embed SoundCloud (patrón empty-media del sistema) cuando el widget no resuelve.
  3. **U-4**: celda "SHOWS" del press kit: ocultar u ofrecer copy cuando el valor es 0/desconocido.
  4. **U-5**: hint `dd-mm-aaaa` accesible en el campo fecha del booking form (sin cambiar el input nativo).
  5. **T-10**: `alt` en `<img>` y `aria-label` en botones icon-only de páginas públicas.
  6. **F2-5**: permitir `va.vercel-scripts.com` en CSP **solo en dev**.
- **Riesgos:** U-2 depende de detectar fallo de iframe cross-origin (mitigación: API `oEmbed`/`resolve` o timeout + mensaje; si resulta frágil, se hace server-side "link out" y se documenta). Ningún cambio toca datos.
- **Aceptación:** unit test de `getInitials`; capturas after muestran monogramas correctos y sin caja vacía; axe/lighthouse no reporta imgs sin alt en `/dj` y `/p/*`.
- **Rollback:** revert por commit (cada sub-cambio commit propio si es separable).

### Etapa E — Rendimiento del press kit (T-7 parcial) · prioridad 7
- **Objetivo:** quitar el waterfall de `/p/[slug]` y el riesgo de cuelgue por Bandcamp.
- **Archivos:** `src/app/p/[slug]/page.tsx` (queries en `Promise.all`), fetch externo con `AbortSignal.timeout`.
- **Riesgos:** cambio de orden de ejecución (mitigación: las 3 queries internas son independientes entre sí — verificado; la página ya maneja resultados vacíos).
- **Aceptación:** página demo carga idéntica (diff visual before/after); tiempo de respuesta menor o igual; type-check verde.
- **Rollback:** revert.

### Etapa F — Suite de pruebas (Fase 8; T-5) · transversal
- **Objetivo:** red de seguridad ejecutable sin credenciales ni escrituras.
- **Contenido:**
  - **Unit (`node:test`, sin dependencias nuevas):** `tz` (guards + conversiones), `getInitials`, `auth-errors` (mapeos), validaciones.
  - **E2E (Playwright ya instalado):** páginas públicas 200 + sin overflow horizontal; **rutas protegidas redirigen sin sesión** (`/admin`, `/crm`, `/dashboard`, `/booker/*`); formularios no aceptan datos inválidos (client-side); headers de seguridad presentes; `/api/*` protegidas devuelven 401/403 sin secret.
  - Escenarios autenticados y de permisos entre cuentas quedan **especificados pero skip** hasta desbloquear CAPTCHA (documentado en el propio test).
- **Aceptación:** `npm run test:unit` y `npm run test:e2e` en verde local.
- **Rollback:** revert (solo añade archivos + 2 scripts npm).

### Etapa G — Validación visual final (Fase 9)
- Recorrido Playwright de páginas públicas en 3 viewports → `screenshots/after/`; comparación con before; corrección de regresiones y repetición hasta estabilidad.

### Diferido explícitamente (próximo ciclo, con decisiones tuyas)
| Ítem | Por qué se difiere | Necesita |
|---|---|---|
| S-1 completo (semántica retry MP) | No testeable sin sandbox MP; producto en pausa | decisión + sandbox |
| S-2 (secret dedicado unsubscribe) | Cambiar la clave HMAC invalida links ya enviados | plan de rotación |
| T-3 (refactor componentes grandes) | Riesgo sin e2e autenticada | CAPTCHA whitelist + suite F |
| U-7 (tokens canónicos) | Decisión de marca | tu definición |
| U-8 (mensaje booker en landing) | Decisión de producto | tu definición |
| U-9 (orden/paginación directorio) | Post-beta | escala |
| Migración `next lint` → ESLint CLI | Cambio de tooling, mejor en PR propio | — |
| Staging Supabase / CLI local | Infraestructura | tu autorización |
