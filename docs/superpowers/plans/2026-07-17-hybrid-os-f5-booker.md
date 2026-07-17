# Hybrid OS — F5 · Booker portal · Implementation Plan

> REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Migrar el portal Booker (`src/app/booker/*`, route group con shell propio, 24 archivos ~3.246 líneas, todo sin migrar) al Hybrid OS glass. **Última fase** — cierra toda la migración. Re-skin SOLO visual: preservar auth/guard del layout, server actions, wizard/TOS, favoritos/pitches/follow, TZ. 5 PRs. El portal hereda `data-theme="dark"` del root → el kit `@/components/hos` funciona.

## Global Constraints
- **Refactor SOLO visual.** NO tocar: `src/app/booker/actions.ts` (todas las actions: `acceptBookerTos`, `completeBookerOnboarding`, `toggleFavoriteAction`, `markPitchViewedAction`, `toggleFollowNotifyAction`, `requestBookerVerification`), `@/lib/queries/{booker,booker-guard,booker-activation-emails,founding-invites,consents}`, el guard chain + `backfilledUsers` Set + gate `=== null` de `layout.tsx`, `<form method="POST" action="/logout">`.
- `@/components/hos` + tokens. `bg-[#...]` nuevo prohibido; convertir el único literal `top-bar.tsx:90` (`bg-[#161616]`/`border-[#2a2a2a]`) + los `style={{...#hex...}}` inline de otras pantallas → tokens. Conservar los `style={{fontFamily:var(--font-*)}}` (Anton/Satoshi).
- **A11y:** +`aria-current="page"` en nav activo; conservar `<Label htmlFor>`↔`id` (wizard), `accent-orange` (TOS/wizard checkboxes).
- **Gate por commit:** `tsc --noEmit && lint && build` + `grep bg-\[#`=0 (+ grep `style={{` para hex inline). `(app)`-like: NO verificable en dev (auth) → inspección + review.

## PR 1 (`feat/hybrid-os-f5-booker-shell`): shell + onboarding
- **Commit 1 — chrome:** `layout.tsx` (solo footer/chrome; guard+backfill+gate INTOCABLES), `top-bar.tsx` (barra `bg-ink`→glass, nav activo clay + `aria-current`, hex→tokens; preservar los 9 items nav [hrefs/labels/icons/comingSoon], active `pathname===href||startsWith(href+"/")`, logout POST, ComingSoonBadge, inicial avatar), `page.tsx` (redirect — sin cambio), `loading.tsx` (skeleton→glass), `error.tsx` (boundary→glass; `reset` + font-anton inline).
- **Commit 2 — onboarding:** `booker-tos-gate.tsx` (`acceptBookerTos` + accepted/pending + `accent-orange` + `TOS_VERSION_LABEL` + links target_blank; card→GlassPanel, Button→clay), `booker-welcome-wizard.tsx` (`completeBookerOnboarding` + step next/back + BOOKER_TYPES + maxLengths + `Label htmlFor↔id` + StepDone + progress pips; card→GlassPanel, inputs→FIELD, select→SELECT, Button→clay).

## PR 2 (`...-discovery`): buscar + match + seguidos
`buscar/{page,buscar-card}`, `match/{page,match-card}`, `seguidos/page`. DJ discovery/smart-match/favoritos → GlassPanel/cards; preservar `toggleFavoriteAction`, match scoring/reasons, filtros, hex inline→tokens.

## PR 3 (`...-requests`): requests + pitches + interesados
`requests/page`, `pitches/{page,pitch-presskit-link}`, `interesados/page`. Preservar `markPitchViewedAction`, links a press-kit, estados.

## PR 4 (`...-convocatorias`): convocatorias + calendario
`convocatorias/{page,[id]/page,[id]/applicants,publish-form}`, `calendario/page`. Preservar publish/applicants flows.

## PR 5 (`...-perfil`): perfil
`perfil/{page,booker-profile-form,verification-request}`. Preservar save + `requestBookerVerification`.

## Self-Review
- Fuera de alcance: `booker/actions.ts`, queries, guard/backfill, logout form.
- Riesgo: medio (portal grande + guard de auth). Mitigación: preservación explícita, gate+review por commit.
