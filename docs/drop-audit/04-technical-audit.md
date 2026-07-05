# DROP — Auditoría integral 2026-07 · Fase 4: Auditoría técnica y arquitectura

- **Fecha:** 2026-07-05 · **Línea base:** lint ✅ (2 warnings), `tsc --noEmit` ✅, build no ejecutado en esta fase.
- **Veredicto general:** código funcional, seguro y con dependencias sobrias (sin bloat). La deuda se concentra en: **testing (inexistente), observabilidad de errores, componentes sobredimensionados y consistencia de helpers**.

## Hallazgos (ordenados por severidad)

### T-5 · CRÍTICA — Cero pruebas automatizadas
- **Evidencia:** no existe ningún `*.test.*`/`*.spec.*` ni carpeta `tests/`; `playwright@1.60` está en devDependencies sin usar.
- **Impacto:** cualquier refactor (T-3) o cambio de actions es a ciegas; las invariantes de seguridad (RLS, gating por rol) no tienen verificación continua.
- **Esfuerzo:** M (setup S + suite crítica M) · **Riesgo de implementación:** nulo (aditivo).
- **Recomendación:** suite e2e Playwright para flujos públicos + tests de protección de rutas (sin credenciales); unit tests ligeros para `lib/` (tz, format, validaciones, auth-errors). Ver Fase 8. Limitación actual: e2e autenticada bloqueada por CAPTCHA (F2-1).

### T-2 · ALTA — Errores silenciados / sin reporte a Sentry en server actions
- **Evidencia:** patrón `catch (e) { return err(e) }` sin `Sentry.captureException` (p.ej. `src/app/(app)/calendario/actions.ts:86-88`); silenciamientos `.catch(() => {})` (press-kit actions, tracklist actions); `res.json().catch(() => ({}))` en `src/app/p/[slug]/booking-form.tsx`.
- **Impacto:** Sentry está configurado pero los fallos de acciones de usuario no llegan; debugging de producción a ciegas.
- **Esfuerzo:** M · **Riesgo:** medio (toca muchos archivos; mecánico).
- **Recomendación:** helper `captureError(e, context)` en `src/lib/` y adopción en actions; los `.catch(() => {})` no críticos pasan a `.catch(captureError)`.

### T-3 · ALTA — Componentes/módulos sobredimensionados (lógica + presentación mezcladas)
- **Evidencia:** `src/lib/email/templates.ts` (2597 líneas, 18+ plantillas duplicando estructura HTML+text), `src/app/p/[slug]/page.tsx` (893), `calendario/[id]/tracklist/tracklist-editor.tsx` (823, 8+ useState + parsing CSV + DnD inline), `perfil/profile-form.tsx` (774), `welcome/welcome-wizard.tsx` (562), `crm/contact-form.tsx` (553).
- **Impacto:** mantenibilidad, re-renders innecesarios (cambiar `draft` re-renderiza toda la tabla del tracklist), onboarding de devs.
- **Esfuerzo:** L (15–20 h total) · **Riesgo:** medio-alto **sin tests** → depende de T-5.
- **Recomendación:** dividir por secciones/subcomponentes (specs concretas en el análisis); `templates.ts` → builder común `wrapEmail()` + contenido por plantilla. **No abordar en esta auditoría** más allá de lo puntual; requiere suite de tests previa.

### T-4 · ALTA — Non-null assertions sin guard en rutas calientes
- **Evidencia:** `src/lib/tz.ts:34,84` (`parts.find(...)!.value` sobre `Intl.formatToParts`), `src/lib/queries/growth.ts` (`byPlatform.get(row.platform)!.push(...)`).
- **Impacto:** crash potencial ante locale/runtime raro o datos inesperados; `tz.ts` es núcleo de fechas de toda la app.
- **Esfuerzo:** S (1–2 h) · **Riesgo:** bajo (cambio defensivo).
- **Recomendación:** guards explícitos con error descriptivo / `?? []` en growth.

### T-1 · MEDIA — Formateo de fechas/moneda duplicado (~83 usos inline vs helpers existentes)
- **Evidencia:** `lib/format.ts` y `lib/tz.ts` existen y se usan 75 veces, pero conviven con `toLocaleString("es-CL", ...)` inline en `calendario/page.tsx:412`, `cobros-view.tsx`, `finance-edit.tsx:87`, `perfil/profile-form.tsx`, press-kit actions, etc.
- **Impacto:** riesgo de divergencia de timezone (UTC vs Santiago cerca de medianoche — clase de bug ya vista en QA-0611 "disponible hoy").
- **Esfuerzo:** M (3–4 h) · **Riesgo:** bajo. **Nota:** `cobros-view.tsx`/`finance-edit.tsx` los elimina `feat/landing-dark` → no tocarlos aquí.

### T-6 · MEDIA — Tipado débil puntual + tipos de BD mantenidos a mano
- **Evidencia:** casts sin guard (`merged.type as ContactType` en `lib/queries/contacts.ts:48`, `form.tags as string[]` en `crm/contact-form.tsx`); `src/types/database.ts` (1394 líneas) manual, con comentario reconociendo que debería autogenerarse.
- **Impacto:** drift silencioso entre esquema y tipos al agregar columnas.
- **Esfuerzo:** S guards / S script de generación · **Riesgo:** bajo.
- **Recomendación:** type guards para enums; script `supabase gen types` documentado (ejecutable cuando haya CLI vinculada — hoy no está instalada).

### T-7 · MEDIA — Waterfalls de queries y ausencia de Suspense/streaming
- **Evidencia:** `src/app/p/[slug]/page.tsx:77-98` — 4 awaits secuenciales (perfil → rider → busyDates → Bandcamp externa sin timeout); 0 usos de `<Suspense>` en `src/`.
- **Impacto:** TTFB del press kit (la página más importante para conversión) suma latencias en serie; la llamada externa a Bandcamp puede colgar el render.
- **Esfuerzo:** S para paralelizar con `Promise.all` + timeout; M para streaming con skeletons · **Riesgo:** bajo (paralelizar) / medio (streaming).

### T-9 · MEDIA — Validación sin fuente única
- **Evidencia:** `EMAIL_RE` en `lib/queries/contacts.ts:12` vs validación nativa del browser vs checks ad-hoc en wizard.
- **Recomendación:** `src/lib/validation.ts` con funciones puras (sin traer zod — evitar dependencia nueva innecesaria). Esfuerzo S–M · riesgo bajo.

### T-10 · MEDIA — Accesibilidad técnica incompleta
- **Evidencia:** `<img>` sin `alt` en `app/p/[slug]/page.tsx`; botones icon-only sin `aria-label` (Plus/Trash2 en editores); táctiles 38px (<44px) señalados en `design-audit/ACCESIBILIDAD.md` sin implementar.
- **Esfuerzo:** M · **Riesgo:** bajo.

### T-8 · BAJA — 109 `console.log/warn/error` sin convención
- **Evidencia:** `app/auth/callback/route.ts` loguea `{ userId, email }`; varios `console.error` con objetos completos.
- **Impacto:** ruido + PII en logs de Vercel.
- **Esfuerzo:** S · **Riesgo:** bajo. Coordinar con T-2 (mismo helper).

## Dependencias
- Sanas y mínimas. `pg` (devDep) se usa solo por scripts ad-hoc (`scripts/run_sql.mjs`); `qrcode` y `web-push` en uso. Sin dependencias sin uso detectadas en `dependencies`. `next lint` deprecado → migrar a ESLint CLI antes de Next 16 (S).

## Matriz resumen

| ID | Severidad | Impacto | Prob. | Esfuerzo | Riesgo impl. | ¿Entra en Fase 7? |
|----|-----------|---------|-------|----------|--------------|--------------------|
| T-5 | Crítica | Alto | — | M | nulo | ✅ (suite pública + rutas protegidas) |
| T-2 | Alta | Alto | Alta | M | medio | ✅ (helper + actions principales) |
| T-3 | Alta | Alto | Media | L | medio-alto | ❌ diferido (requiere T-5 completo + decisión) |
| T-4 | Alta | Medio | Baja | S | bajo | ✅ |
| T-1 | Media | Medio | Media | M | bajo | ⚠️ parcial (solo archivos que no toca `feat/landing-dark`) |
| T-6 | Media | Medio | Media | S | bajo | ✅ (guards; generación de tipos documentada) |
| T-7 | Media | Alto | Alta | S–M | bajo–medio | ✅ (paralelizar + timeout; streaming diferido) |
| T-9 | Media | Medio | Media | S–M | bajo | ✅ |
| T-10 | Media | Medio | Alta | M | bajo | ⚠️ parcial (alt/aria en páginas públicas) |
| T-8 | Baja | Bajo | Alta | S | bajo | ⚠️ parcial (PII en logs de auth) |
