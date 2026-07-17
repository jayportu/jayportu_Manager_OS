# Hybrid OS — F4 · Admin (backoffice) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Migrar el backoffice `(app)/admin/*` (32 archivos, ~4.500 líneas, todo sin migrar) al Hybrid OS glass, con paridad funcional total. Re-skin SOLO visual: preservar auth (`assertAdmin`), server actions, confirmaciones destructivas (`useConfirm` + `typeToConfirm`/`requireReason`), polling, TZ. 5 PRs.

**Tech Stack:** Next.js 15, React 18, Tailwind, TS strict. Kit `@/components/hos`. Mockups en `ui-experiments/app-redesign/admin/*` (referencia visual; NO copiar el hex crudo NI la simplificación de UX del mockup — p.ej. NO colapsar controles en un menú "Gestionar").

## Global Constraints
- **Refactor SOLO visual.** NO tocar: `@/lib/queries/admin` (`assertAdmin`, `createAdminClient`, queries), `(app)/admin/actions.ts` (todas las server actions), `@/components/admin/confirm-dialog` (ConfirmProvider/useConfirm internals). Preservar el gate `assertAdmin()` en layout + cada page (SEGURIDAD), los payloads/coerción de cada action, y las variantes de confirm (`warning`/`danger`/`requireReason`/`typeToConfirm:"ELIMINAR"`).
- Consumir `@/components/hos` + tokens. `bg-[#...]` nuevo prohibido. Convertir superficies brutalistas: `Card`, `border-2`, `bg-ink`/`bg-cream`/`text-ink`, `bg-bg-panel`, `rounded-full`, y el helper `adminBtn()` (`@/components/admin/buttons.ts`, carga `border-2`/`bg-ink`/`bg-cream`) → clay/tokens. **Estrategia adminBtn:** en cada PR, reemplazar el uso de `adminBtn` por botones del kit en los componentes de ese PR; cuando no queden consumidores, borrar `buttons.ts`.
- **A11y:** agregar `aria-current="page"` al nav (upgrade seguro, el mockup lo hace); conservar `<Label htmlFor>`↔`id`, `title=` de botones-icono, roles del confirm.
- **Gate (por commit):** `npx tsc --noEmit && npm run lint && npm run build` + `grep bg-\[#` = 0. `(app)` NO verificable en dev (CAPTCHA) → inspección + review adversarial.

## PR 1 (`feat/hybrid-os-f4-admin-shell`): shell + home + acciones compartidas
- **Commit 1 — shell:** `layout.tsx` (preservar `assertAdmin()` + `ConfirmProvider` + `AdminNav`), `admin-nav.tsx` (barra glass, tab activo clay, `aria-current`; preservar las 13 secciones + "Volver a la app" + breadcrumb + `usePathname` active `exact`/`startsWith`).
- **Commit 2 — home + 5 componentes:** `page.tsx` (Card→GlassPanel, header→SectionHero, Kpi local re-vestido conservando icono+valor+label, tabla→GlassPanel/TableShell, estados→Badge tone; **preservar el branch is_admin/isOnboarded/pending que monta los 5 componentes con props exactas** — NO colapsar a "Gestionar"; `assertAdmin`, `getGlobalMetrics`/`getAllUsers`, `onboardingRate`/`pushAdoption` guards) + `account-status-control.tsx` / `verify-dj-button.tsx` / `drop-pick-button.tsx` / `dj-verification-chips.tsx` / `delete-pending-user-button.tsx` (re-vestir botones a clay/token; preservar `setAccountStatusAction`/`deleteUserAction`/`setDjVerifiedAction`/`setDjDropPickAction`/`setDjVerificationAction`/`notifyAndDeleteUserAction` + `useConfirm` flows + `router.refresh`).

## PR 2 (`feat/hybrid-os-f4-admin-metrics`): pulso + trafico + analytics
`pulso/page.tsx`, `trafico/{page,live-refresher}.tsx`, `analytics/page.tsx`. Dashboards de métricas → KpiTile/GlassPanel; preservar el polling de `live-refresher`/`trafico` y todas las queries/TZ.

## PR 3 (`feat/hybrid-os-f4-admin-users`): solicitudes + bookers + founding
`beta-requests/{page,beta-requests-table(441)}.tsx`, `bookers/{page,booker-status-control,verify-button}.tsx`, `founding-invites/{page,founding-invites-client(261)}.tsx`. Tablas de gestión → TableShell/GlassPanel; preservar acciones de aprobación/verificación/invitación + confirms.

## PR 4 (`feat/hybrid-os-f4-admin-ops`): feedback + email-campaigns + bajas + nudge
`feedback/{page,feedback-table}.tsx`, `email-campaigns/{page,auto-refresh}.tsx`, `bajas/page.tsx`, `onboarding-nudge/page.tsx`. Preservar auto-refresh y acciones.

## PR 5 (`feat/hybrid-os-f4-admin-comms`): correo + beta-reminder
`correo/{page,compose,mark-read,reply-form}.tsx`, `beta-reminder/{page,beta-reminder-client,santis-followup-button}.tsx`. Herramientas de comunicación → glass; preservar envío/reply/mark-read + Resend. Cuando se migre el último consumidor de `adminBtn`, borrar `@/components/admin/buttons.ts`.

## Self-Review
- Cobertura: shell+home (1), métricas (2), gestión usuarios/bookers (3), ops (4), comms (5).
- Fuera de alcance: `queries/admin`, `admin/actions.ts`, `confirm-dialog` internals.
- Riesgo: medio-alto (auth + acciones destructivas + tablas grandes). Mitigación: preservación explícita, gate+review por commit, verificación por inspección (CAPTCHA bloquea dev).
