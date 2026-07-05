# DROP — Auditoría integral 2026-07 · Fase 10: Informe final

- **Fecha:** 2026-07-05 · **Rama:** `audit/drop-integral-2026-07` (desde `main` @ `8dc3dd9`) · **Producción intacta:** sin push, sin PR, sin cambios en Vercel/Supabase/MercadoPago/Cloudflare.

## 1. Resumen ejecutivo

DROP está en **buen estado estructural**: seguridad endurecida (RLS 38/38, triggers anti-escalación, webhooks firmados, CSP enforced, 0 secretos expuestos), identidad visual propia y documentación de producto excepcional. La auditoría no encontró vulnerabilidades críticas ni altas. La deuda real está en: **(a) cero pruebas automatizadas** (resuelto parcialmente en este ciclo), **(b) errores de server actions invisibles para Sentry** (resuelto), **(c) imposibilidad de QA autenticada local por el CAPTCHA** (bloqueo externo, requiere 1 minuto tuyo en Cloudflare), y **(d) componentes sobredimensionados** (diferido con plan). Se corrigieron además defectos visibles de primera impresión (monogramas rotos, embed vacío, stats "—") y un **bug latente real de timezone** destapado por los tests nuevos.

## 2. Problemas encontrados
Detalle completo por fase: [01-current-state](01-current-state.md) (R1–R10) · [02-role-flows](02-role-flows.md) (F2-1..F2-8) · [03-ux-ui-strategy](03-ux-ui-strategy.md) (U-1..U-9) · [04-technical-audit](04-technical-audit.md) (T-1..T-10) · [05-security-privacy](05-security-privacy.md) (S-1..S-8, P-1..P-2).

## 3. Cambios implementados (commits en orden, todos reversibles con `git revert`)

| Commit | Etapa | Contenido |
|---|---|---|
| `57bb892`…`769b7cb` | Docs | Informes de fases 1–6 + 34 capturas before |
| `a5e016b` | A | `.gitignore`: bases de contactos xlsx, CSVs de campañas, JSON de scripts, imágenes con PII (P-1). Verificado que no afecta archivos trackeados |
| `72839b5` | B | Validación de IDs en `/api/correo/attachment` (S-3); traducción es-CL de errores captcha (S-6); guards sin `!` en `tz.ts` y `growth.ts` (T-4) |
| `3f40c18` | C | `src/lib/observability.ts` + captura Sentry en los `err()`/`errResult()` de 7 actions (T-2); email fuera del log de `/auth/callback` (T-8) |
| `c8434ac` | D | `getInitials()` única (arregla "A(" y elimina 3 copias) (U-1); fallback de SoundCloud muerto vía oEmbed (U-2); stats del press kit sin celdas "—" (U-4); `lang` en fecha de booking (U-5); CSP: soundcloud.com en connect-src y analytics-debug solo dev (F2-5) |
| `1d95e40` | E | `/p/[slug]`: 4 queries en `Promise.all` + timeout 5s con fallback al fetch de Bandcamp (T-7) |
| `4e29b45` | F | Suite: 21 unit (node:test, 0 deps nuevas) + 43 e2e Playwright; **fix de bug real**: `santiagoToUtcISO` dependía de la tz del host (correcto solo en UTC/Vercel; erróneo en cualquier máquina en hora chilena) → `Date.UTC` sobre `formatToParts`; `tests/` fuera de tsconfig; scripts npm `test:unit`/`test:e2e`/`test` |
| `42442e0` | G | Capturas after (3 viewports) |

**Decisiones de arquitectura:** sin dependencias nuevas (unit tests con `node:test` nativo, e2e con el Playwright ya presente); instrumentación de errores en los helpers locales (1 punto por archivo, contrato intacto); nada de refactors grandes sin runtime autenticado; ningún archivo tocado que `feat/landing-dark` reescriba.

## 4. Resultados de verificación

| Chequeo | Resultado |
|---|---|
| `npm run lint` | ✅ 0 errores (2 warnings preexistentes, no introducidos) |
| `npx tsc --noEmit` | ✅ 0 errores |
| `npm run test:unit` | ✅ 21/21 |
| `npm run test:e2e` | ✅ 43/43 (7 skip documentados: requieren CAPTCHA desbloqueado) |
| `npm run build` | ✅ compila |
| Consola navegador (10 páginas × 3 viewports) | ✅ limpia (único 404: oEmbed detectando la cuenta SoundCloud muerta del perfil demo — esperado) |
| Overflow horizontal móvil/tablet | ✅ ninguno |

## 5. Antes / después (evidencia)
`docs/drop-audit/screenshots/{before,after}/` — comparar `desktop--dj-directorio.png` (monogramas "A(" → "A."), `desktop--presskit-demo.png` (embed vacío → link; "– SHOWS" → franja 2-col con datos reales).

## 6. Riesgos restantes y deuda pendiente (priorizados)
1. **F2-1 · QA autenticada imposible en local** — whitelistear `localhost` en la site key de Turnstile (Cloudflare). Desbloquea los 7 tests skip y el resto de la Fase 2.
2. **P-2 · Dev local = BD de producción** — decidir staging (proyecto Supabase espejo con las 66 migraciones o CLI local). Riesgo estructural.
3. **T-3 · Componentes >500 líneas** (`templates.ts` 2597, `p/[slug]/page.tsx` ~900, `tracklist-editor` 823, `profile-form` 774) — refactor por secciones cuando existan e2e autenticadas.
4. **S-1 · Webhook MP** reintentos sin distinción de error — abordar al reactivar Fase 4 con sandbox.
5. **S-2 · UNSUBSCRIBE_SECRET** — confirmar seteada en Vercel; plan de rotación (cambiarla invalida links ya enviados).
6. **U-7 · Tokens canónicos** (#E85A0C vs #FF7A1A) y **U-8 · mensaje booker** ("próximamente" vs footer "SOY BOOKER") — decisiones tuyas.
7. Ítems abiertos del roadmap que esta auditoría re-confirma: WAF rate-limit, DMARC p=reject, rotación de API key Resend, verificación de backups Supabase, flujo de eliminación de cuenta self-service.
8. `next lint` deprecado → migrar a ESLint CLI antes de Next 16.

## 7. Funciones que no pudieron probarse en runtime (y por qué)
Dashboard/CRM/calendario/perfil/press-kit-editor/campañas/gmail/growth/IA logueado como DJ; todo el lado booker; panel admin; onboarding wizard; subida de archivos; pagos MP; envío real de emails; crons en Vercel. Causa: CAPTCHA (F2-1) + regla de no escribir en BD de producción + no usar credenciales reales. Cobertura alternativa: análisis de código + RLS + tests de protección de rutas.

## 8. Cómo ejecutar y revisar
```bash
cd jayportu_Manager_OS
git checkout audit/drop-integral-2026-07
npm run dev              # puerto 3010 (usa el .env.local existente — apunta a Supabase remoto)
npm run test:unit        # 21 tests, sin red
npm run test:e2e         # 43 tests contra localhost:3010 (levanta el server si no está)
npm run lint && npx tsc --noEmit && npm run build
git log --oneline main..audit/drop-integral-2026-07   # revisar commit a commit
git diff main..audit/drop-integral-2026-07 -- src/ next.config.mjs .gitignore package.json tsconfig.json  # solo código
```

## 9. Rollback
- Todo local: `main` no fue tocado; producción no fue tocada. Descartar todo = quedarse en `main` (o borrar la rama).
- Por cambio: `git revert <sha>` (cada etapa es un commit independiente).
- El único archivo de entorno tocado durante la sesión (`.env.local`, para probar la site key) fue **restaurado a su estado original**.

## 10. Recomendaciones para el siguiente ciclo
1. Whitelistear localhost en Turnstile → completar Fase 2 autenticada con la cuenta demo (script reutilizable ya escrito) → activar los tests skip.
2. Decidir y documentar el naranjo canónico (recomendado: el que está en prod) y archivar `TOKENS_DARK.md` como superseded.
3. Staging de Supabase antes de cualquier refactor grande o migración.
4. Refactor T-3 empezando por `templates.ts` (riesgo bajo, no toca UI).
5. CI (GitHub Actions): lint + tsc + test:unit + test:e2e en cada PR — la suite ya está lista para enchufarse.
