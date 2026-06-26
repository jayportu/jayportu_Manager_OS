# Plan de migración, esfuerzo y riesgos — DROP Dark

Cómo llevar el rebrand a la app real **sin romperla**, fraccionable, con cada paso verificable. Cero cambios en prod hasta tu OK explícito.

## El problema central (de la auditoría)

La app usa **tokens de color hex fijos** en `tailwind.config.ts` (`bg`, `fg`, `border-ink`, `bg-cream`, `bg-orange`…) + algunos one-off (sidebar `#161616`, `#2a2a2a`). El dark **no es "activar `.dark`"** hasta que esos tokens sean **CSS variables**. Por eso la migración empieza por ahí.

## Fases (cada una es un PR verificable)

**Fase 0 — Tokenizar (sin cambio visual).** ~1–2 días · riesgo bajo
- Definir el set dark como CSS variables en `globals.css :root` (`--c-bg`, `--c-surface`, `--c-text…`).
- Repuntar los colores de `tailwind.config.ts` a `var(--c-…)` **sin renombrar clases** (toda la app sigue usando `bg-bg`, `text-fg`, etc.).
- Poner los **valores actuales (cream/ink/orange)** en `:root` → **nada cambia visualmente todavía**. Build verde.
- Grep de hex sueltos (`#161616`, `#2a2a2a`, inline styles, gradientes) y migrarlos a tokens.
- *Resultado:* tokens desacoplados de valores. Habilita todo lo demás.

**Fase 1 — Tema dark detrás de flag + ruta de QA.** ~2–3 días
- Agregar override `[data-theme="dark"]` (o `.dark`) en `globals.css` con los valores dark.
- Activarlo en una **ruta de preview `/ui-lab`** (o cookie/flag) → QA de toda la app en dark **sin afectar a usuarios**. Iterar pantalla por pantalla.

**Fase 2 — Refinamientos de componentes.** ~5–8 días (según alcance)
- Unificar **KPI cards** (sin arcoíris), **un solo botón primario**, bordes 2px→1px, radius, casing de títulos.
- Sidebar: grises one-off → tokens. 404 branded + `/signup`→`/beta`.
- Motion: hero en **canvas**, scroll-reveal, cross-dissolve; quitar blur/blend animados.
- (Opcional, features nuevas: calendario vista-mes/mapa, galería con carpetas, selector de rol, landing nuevo → suman tiempo, ver abajo.)

**Fase 3 — Flip + limpieza + a11y.** ~2–3 días
- Hacer dark el default (o mantener light como tema opcional si se quiere).
- Checklist de [ACCESIBILIDAD.md](ACCESIBILIDAD.md) (focus ring offset, targets ≥44, foco-trap, aria).
- Validar con Lighthouse/axe (chrome-devtools MCP) + `npm run build` antes de cada push (ver [[vercel_build_lesson_drop]]).

> **Rollout por grupos de pantalla** detrás del flag: público → DJ app (dashboard/CRM/calendario/press-kit/perfil) → admin. Mergear la migración de tokens **antes** del código que la usa (ver [[deploy_workflow_drop]]).

## Estimación de esfuerzo

| Bloque | Días dev (aprox.) |
|---|---|
| Rebrand visual core (Fases 0–1–3, sin features nuevas) | **8–12** |
| Features nuevas (calendario mes/mapa, galería carpetas, selector de rol, landing nuevo) | **+6–10** |
| **Total según alcance** | **~2–4 semanas, fraccionable** |

Recomendación de orden de valor: **Fase 0+1 primero** (tokeniza + preview dark) → ves la app entera en dark con bajo riesgo y decides el resto incrementalmente.

## Riesgos técnicos

- **Hex sueltos / inline styles / gradientes** que no usan tokens → no cambian solos. Mitigación: grep sweep en Fase 0.
- **Press kit público**: es el activo compartible del DJ (lo ven bookers). Pasarlo a dark cambia su presentación pública → **decisión**: ¿press kit público también dark, o se mantiene? (su hero ya es oscuro).
- **Contenido subido por usuarios** (logos/fotos con fondo claro) puede chocar contra el dark → dar padding/surface o detección.
- **Dos sistemas de color** (tokens literales + shadcn HSL vars) → reconciliar en Fase 0.
- **Build estricto de Vercel** (ESLint) → `npm run build` local antes de push.
- **Emails (Resend)** son plantillas aparte (claras) → no afectados por este rebrand.

## Archivos creados (todo en `design-audit/`, rama `design/drop-dark-rebranding`)

**Docs:** `AUDITORIA_FASE1.md` · `BENCHMARK_FASE2.md` · `MAVELPOINT_REVISION2.md` · `OPORTUNIDADES_FUNCIONES.md` · `TOKENS_DARK.md` · `DESIGN_SYSTEM.md` · `ACCESIBILIDAD.md` · `PLAN_MIGRACION.md` (este).
**Mockups (HTML interactivos):** `MOCKUP_landing.html` (v1 navy) · `MOCKUP_landing_v2.html` (dark #E85A0C, hero canvas + tabs + FAQ) · `MOCKUP_perfil_galeria.html` · `MOCKUP_dashboard.html` · `MOCKUP_calendario.html` · `MOCKUP_calendario_mapa.html` · `MOCKUP_signup_rol.html` · `PROTOTIPO_ui-lab.html` · `DIRECCIONES_DARK.html`.
**Capturas:** `design-audit/screenshots/` y `design-audit/mavelpoint/`.

> **Nada de esto toca el código de la app** (`src/`). Son archivos estáticos de diseño en su propia carpeta.

## Cómo correr / ver los mockups

1. **Servidor local** (ya levantado): `http://localhost:8088/<archivo>.html` — el más cómodo, anima en vivo.
   - Si se cae: `python3 -m http.server 8088 --directory design-audit` desde la raíz del repo.
2. **Doble-click** a cualquier `design-audit/*.html` → abre en el navegador.
3. **Panel de preview** de Claude Code (vista rápida; el navegador manda para performance real).
