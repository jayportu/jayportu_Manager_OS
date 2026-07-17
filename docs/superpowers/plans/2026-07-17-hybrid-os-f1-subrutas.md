# Hybrid OS — F1 · Subrutas (calendario modales/evento/tracklist + CRM importar/recurrentes) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox syntax.

**Goal:** Migrar las subrutas F1 que quedaron pendientes del lado DJ (modales/subrutas de calendario y CRM) al Hybrid OS glass, con paridad funcional total. Cierra el lado DJ al 100% real. Re-skin SOLO visual: preservar toda la lógica (server actions, coerción de fechas/montos, TZ, sync-lock, estado de modales, a11y). 3 PRs.

**Tech Stack:** Next.js 15 (server pages + client modals/forms), React 18, Tailwind, TS strict. Kit `@/components/hos` (en main): `GlassPanel, MonoLabel, Badge, Alert, EmptyState, Toggle, FIELD, SELECT` + `Button` variantes `clay`/`clayPrimary`. **El kit NO tiene Dialog/Modal ni Field-component** — los modales son overlays custom (`bg-black/70 backdrop-blur-sm` conservado) con `GlassPanel` adentro; inputs = clases `FIELD`/`SELECT`.

## Global Constraints
- **Refactor SOLO visual.** NO tocar: `calendario/actions.ts`, `crm/actions.ts`, `crm/recurrentes/recurrentes-actions.tsx` (lógica server), `sync-lock.ts` (mutex), queries (`@/lib/queries/*`). Preservar byte-a-byte todo estado/efecto/acción/coerción listado en cada task.
- Consumir `@/components/hos` + tokens. `bg-[#...]` nuevo prohibido. Convertir superficies brutalistas (`Card`, `border-2 border-border`, `bg-cream`/`bg-ink`/`text-ink`, `bg-bg-panel`) → glass/tokens/clay. Los `focus:border-[#E85A0C]` del kit `FIELD` son parte del kit (ok).
- **A11y:** `<Label htmlFor>`↔`id` conservados; checkboxes `accent-orange`; `disabled` de submits; `stopPropagation`/`preventDefault` de triggers; cierre por backdrop; iconos `aria-hidden`.
- **Gate (por commit):** `npx tsc --noEmit && npm run lint && npm run build` + `grep bg-\[#` = 0 en los archivos tocados. `(app)` NO verificable en dev (CAPTCHA) → verificación por inspección + diff de lógica + review adversarial.
- **Referencia visual:** el resto de calendario/CRM ya migrado (`month-view`, `cobros-view`, `crm/page`, `crm/[id]`) + mockups en `ui-experiments/app-redesign/calendario`. Usar tokens de producción (NO el hex crudo de los mockups).

---

### PR A (`feat/hybrid-os-f1-calendario-modales`): modales/acciones de calendario

**Files:** `calendario/{event-edit,finance-edit,new-event-button,mark-paid-button,sync-button,auto-sync}.tsx`. (`view-toggle.tsx` ya está migrado.)

**Commit 1 — modales de formulario:** `event-edit.tsx`, `finance-edit.tsx`, `new-event-button.tsx`.
- Preservar: `isoToLocalInput`, `defaultStart/defaultEnd`, inputs `datetime-local`, validación `end<=start`; coerción monto `replace(/\D/g,"")`+`parseInt`+`toLocaleString("es-CL")`+`$`, `inputMode="numeric"`; `hasFinanceInfo` (tono del trigger de finance-edit); gating finance por `showFinance`/`type==="show"`; `updateEventAction`/`deleteEventAction`/`updateEventFinanceAction`/`createEventAction` (de `./actions`) con payloads exactos (`startISO=undefined` si all_day; `contactId||null`; `amount && !isNaN ? amount : null`); `useTransition`, `router.refresh()`, `confirmDelete`, backdrop-close + `stopPropagation`/`preventDefault`; props de `NewEventButton` (`contactId/buttonLabel/buttonVariant/buttonSize` — usado por `crm/[id]/page.tsx`). Overlay glass; `Card`→`GlassPanel`; danger boxes→`Alert`/tono; footer/borde→tokens; kicker mono + title font-display conservados; checkbox `accent-orange`.

**Commit 2 — acciones/estado:** `mark-paid-button.tsx`, `sync-button.tsx`, `auto-sync.tsx`.
- Preservar: `updateEventFinanceAction(id,{payment_status:"paid"})` (mark-paid); `syncEventsAction` + `acquireSyncLock`/`releaseSyncLock`/`useIsSyncing` (mutex compartido sync-button↔auto-sync), `router.push('/calendario?synced=…'|'?error=…')`+`refresh`; `AutoSync` useRef-guard + useEffect deps `[lastSyncAt,staleMinutes,router]` + `diffMin>=staleMinutes` + fire-and-forget silencioso. Botones→clay/tono; toast de auto-sync→superficie glass (`bg-bg-panel border`→GlassPanel/tokens); `animate-spin` conservado.

---

### PR B (`feat/hybrid-os-f1-calendario-evento-tracklist`): evento + tracklist

**Files:** `calendario/[id]/evento/{page,evento-manager}.tsx`, `calendario/[id]/tracklist/{page,tracklist-editor}.tsx`.
- `evento-manager.tsx` (315) + `tracklist-editor.tsx` (823, el más grande) — recon dedicado antes de implementar. Preservar `publishEventAction` (avisa a fans, `maxDuration=60`), RSVPs, siteUrl, y toda la lógica del editor de tracklist (drag/orden/autosave/parse). `page.tsx` (evento) ya tiene el link "Volver" con tokens — cambio mínimo.

---

### PR C (`feat/hybrid-os-f1-crm-subrutas`): CRM importar + recurrentes + wrappers

**Files:** `crm/importar/{page,import-form}.tsx`, `crm/recurrentes/{page,recurrentes-actions}.tsx`, `crm/nuevo/page.tsx`, `crm/[id]/editar/page.tsx`.
- `import-form.tsx` (252, CSV import): preservar parseo/preview/validación + acción de import. `recurrentes` (page + actions): preservar `recurrentes-actions.tsx` (server) intacto, re-vestir solo la UI. `nuevo`/`editar` = wrappers chicos que montan `contact-form` (ya migrado) — probablemente cambio nulo/mínimo.

---

## Self-Review
- Cobertura: calendario modales (A), evento+tracklist (B), CRM subrutas (C) → glass sin borrar lógica.
- Fuera de alcance: `*/actions.ts`, `sync-lock.ts`, queries, `recurrentes-actions` (server).
- Riesgo: medio (modales con fechas/montos + tracklist-editor grande). Mitigación: 3 PRs, 2 commits en A, preservación explícita, gate+review por commit, verificación por inspección (CAPTCHA bloquea dev).
